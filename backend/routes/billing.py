# Billing Management Routes
from flask import Blueprint, request, jsonify, send_file
from services.supabase_client import get_supabase
from services.pdf_generator import generate_bill_pdf
from datetime import datetime
import os

bp = Blueprint('billing', __name__)
supabase = get_supabase()

@bp.route('', methods=['GET'])
def get_bills():
    """Get all bills"""
    try:
        # Query parameters
        customer_id = request.args.get('customer_id', '')
        payment_status = request.args.get('payment_status', '')
        
        query = supabase.table('bills').select('*, customers(name, phone), orders(fabric_type, quantity_meters)')
        
        if customer_id:
            query = query.eq('customer_id', customer_id)
        
        if payment_status:
            query = query.eq('payment_status', payment_status)
        
        response = query.order('bill_date', desc=True).execute()
        
        return jsonify({
            'success': True,
            'data': response.data,
            'count': len(response.data)
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/<bill_id>', methods=['GET'])
def get_bill(bill_id):
    """Get single bill by ID"""
    try:
        response = supabase.table('bills').select('*, customers(*), orders(*)').eq('id', bill_id).execute()
        
        if not response.data:
            return jsonify({'success': False, 'error': 'Bill not found'}), 404
        
        return jsonify({
            'success': True,
            'data': response.data[0]
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('', methods=['POST'])
def create_bill():
    """Generate bill for an order"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['order_id', 'customer_id']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'{field} is required'}), 400
        
        # Get order details
        order_response = supabase.table('orders').select('*').eq('id', data['order_id']).execute()
        
        if not order_response.data:
            return jsonify({'success': False, 'error': 'Order not found'}), 404
        
        order = order_response.data[0]
        
        # Generate unique bill number
        # Format: RKT-YYYY-XXXX
        year = datetime.now().year
        bill_count_response = supabase.table('bills').select('id').execute()
        bill_count = len(bill_count_response.data) + 1
        bill_number = f"RKT-{year}-{bill_count:04d}"
        
        # Calculate amounts
        subtotal = float(order['total_amount'])
        gst_rate = float(data.get('gst_rate', 0))  # GST % (e.g., 5, 12, 18)
        gst_amount = (subtotal * gst_rate) / 100 if gst_rate > 0 else 0
        total_amount = subtotal + gst_amount
        
        # Create bill
        bill_data = {
            'bill_number': bill_number,
            'order_id': data['order_id'],
            'customer_id': data['customer_id'],
            'subtotal': subtotal,
            'gst_amount': gst_amount,
            'total_amount': total_amount,
            'payment_status': 'Pending'
        }
        
        bill_response = supabase.table('bills').insert(bill_data).execute()
        bill = bill_response.data[0]
        
        # Update order status to Completed
        supabase.table('orders').update({'status': 'Completed'}).eq('id', data['order_id']).execute()
        
        # Generate PDF (optional - can be done separately)
        # pdf_path = generate_bill_pdf(bill['id'])
        
        return jsonify({
            'success': True,
            'message': 'Bill generated successfully',
            'data': bill
        }), 201
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/<bill_id>/payment', methods=['PUT'])
def update_payment_status(bill_id):
    """Update payment status of a bill"""
    try:
        data = request.get_json()
        
        if 'payment_status' not in data:
            return jsonify({'success': False, 'error': 'payment_status is required'}), 400
        
        # Check if bill exists
        existing = supabase.table('bills').select('*').eq('id', bill_id).execute()
        if not existing.data:
            return jsonify({'success': False, 'error': 'Bill not found'}), 404
        
        # Update payment status
        response = supabase.table('bills').update({
            'payment_status': data['payment_status']
        }).eq('id', bill_id).execute()
        
        return jsonify({
            'success': True,
            'message': 'Payment status updated successfully',
            'data': response.data[0]
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/<bill_id>/download', methods=['GET'])
def download_bill(bill_id):
    """Download bill as PDF"""
    try:
        # Get bill details with customer and order info
        response = supabase.table('bills').select('*, customers(*), orders(*)').eq('id', bill_id).execute()
        
        if not response.data:
            return jsonify({'success': False, 'error': 'Bill not found'}), 404
        
        bill_data = response.data[0]
        
        # Generate PDF
        pdf_path = generate_bill_pdf(bill_data)
        
        if not pdf_path or not os.path.exists(pdf_path):
            return jsonify({'success': False, 'error': 'Failed to generate PDF'}), 500
        
        return send_file(
            pdf_path,
            as_attachment=True,
            download_name=f"{bill_data['bill_number']}.pdf",
            mimetype='application/pdf'
        )
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/summary', methods=['GET'])
def get_billing_summary():
    """Get billing summary statistics"""
    try:
        response = supabase.table('bills').select('*').execute()
        
        total_bills = len(response.data)
        total_revenue = sum(float(bill['total_amount']) for bill in response.data)
        paid_bills = len([bill for bill in response.data if bill['payment_status'] == 'Paid'])
        pending_bills = total_bills - paid_bills
        pending_amount = sum(float(bill['total_amount']) for bill in response.data if bill['payment_status'] == 'Pending')
        
        return jsonify({
            'success': True,
            'data': {
                'total_bills': total_bills,
                'total_revenue': round(total_revenue, 2),
                'paid_bills': paid_bills,
                'pending_bills': pending_bills,
                'pending_amount': round(pending_amount, 2)
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
