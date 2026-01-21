# Customer Management Routes
from flask import Blueprint, request, jsonify
from services.supabase_client import get_supabase
from datetime import datetime

bp = Blueprint('customers', __name__)
supabase = get_supabase()

@bp.route('', methods=['GET'])
def get_customers():
    """Get all customers"""
    try:
        # Query parameters for search/filter
        search = request.args.get('search', '')
        business_type = request.args.get('business_type', '')
        
        query = supabase.table('customers').select('*')
        
        if search:
            query = query.or_(f'name.ilike.%{search}%,phone.ilike.%{search}%')
        
        if business_type:
            query = query.eq('business_type', business_type)
        
        response = query.order('created_at', desc=True).execute()
        
        return jsonify({
            'success': True,
            'data': response.data,
            'count': len(response.data)
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/<customer_id>', methods=['GET'])
def get_customer(customer_id):
    """Get single customer by ID"""
    try:
        response = supabase.table('customers').select('*').eq('id', customer_id).execute()
        
        if not response.data:
            return jsonify({'success': False, 'error': 'Customer not found'}), 404
        
        return jsonify({
            'success': True,
            'data': response.data[0]
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('', methods=['POST'])
def create_customer():
    """Create new customer"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'phone']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'{field} is required'}), 400
        
        # Check if phone already exists
        existing = supabase.table('customers').select('id').eq('phone', data['phone']).execute()
        if existing.data:
            return jsonify({'success': False, 'error': 'Phone number already exists'}), 400
        
        # Insert customer
        customer_data = {
            'name': data['name'],
            'phone': data['phone'],
            'business_type': data.get('business_type', ''),
            'address': data.get('address', '')
        }
        
        response = supabase.table('customers').insert(customer_data).execute()
        
        return jsonify({
            'success': True,
            'message': 'Customer created successfully',
            'data': response.data[0]
        }), 201
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/<customer_id>', methods=['PUT'])
def update_customer(customer_id):
    """Update customer"""
    try:
        data = request.get_json()
        
        # Check if customer exists
        existing = supabase.table('customers').select('id').eq('id', customer_id).execute()
        if not existing.data:
            return jsonify({'success': False, 'error': 'Customer not found'}), 404
        
        # Update customer
        update_data = {}
        if 'name' in data:
            update_data['name'] = data['name']
        if 'phone' in data:
            update_data['phone'] = data['phone']
        if 'business_type' in data:
            update_data['business_type'] = data['business_type']
        if 'address' in data:
            update_data['address'] = data['address']
        
        response = supabase.table('customers').update(update_data).eq('id', customer_id).execute()
        
        return jsonify({
            'success': True,
            'message': 'Customer updated successfully',
            'data': response.data[0]
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/<customer_id>', methods=['DELETE'])
def delete_customer(customer_id):
    """Delete customer"""
    try:
        # Check if customer exists
        existing = supabase.table('customers').select('id').eq('id', customer_id).execute()
        if not existing.data:
            return jsonify({'success': False, 'error': 'Customer not found'}), 404
        
        # Delete customer
        supabase.table('customers').delete().eq('id', customer_id).execute()
        
        return jsonify({
            'success': True,
            'message': 'Customer deleted successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/search', methods=['GET'])
def search_by_phone():
    """Search customer by phone number"""
    try:
        phone = request.args.get('phone', '')
        
        if not phone:
            return jsonify({'success': False, 'error': 'Phone number is required'}), 400
        
        response = supabase.table('customers').select('*').eq('phone', phone).execute()
        
        if not response.data:
            return jsonify({
                'success': True,
                'found': False,
                'data': None
            }), 200
        
        # Get customer order history
        customer_id = response.data[0]['id']
        orders = supabase.table('orders').select('*').eq('customer_id', customer_id).order('order_date', desc=True).limit(5).execute()
        
        return jsonify({
            'success': True,
            'found': True,
            'data': {
                'customer': response.data[0],
                'recent_orders': orders.data
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
