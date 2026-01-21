# Order Management Routes
from flask import Blueprint, request, jsonify
from services.supabase_client import get_supabase
from datetime import datetime
from decimal import Decimal

bp = Blueprint('orders', __name__)
supabase = get_supabase()

@bp.route('', methods=['GET'])
def get_orders():
    """Get all orders"""
    try:
        # Query parameters
        customer_id = request.args.get('customer_id', '')
        status = request.args.get('status', '')
        
        query = supabase.table('orders').select('*, customers(name, phone)')
        
        if customer_id:
            query = query.eq('customer_id', customer_id)
        
        if status:
            query = query.eq('status', status)
        
        response = query.order('order_date', desc=True).execute()
        
        return jsonify({
            'success': True,
            'data': response.data,
            'count': len(response.data)
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/<order_id>', methods=['GET'])
def get_order(order_id):
    """Get single order by ID"""
    try:
        response = supabase.table('orders').select('*, customers(*)').eq('id', order_id).execute()
        
        if not response.data:
            return jsonify({'success': False, 'error': 'Order not found'}), 404
        
        return jsonify({
            'success': True,
            'data': response.data[0]
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('', methods=['POST'])
def create_order():
    """Create new order"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['customer_id', 'fabric_type', 'quantity_meters', 'rate_per_meter']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'{field} is required'}), 400
        
        # Check inventory availability
        inventory_response = supabase.table('inventory').select('*').eq('fabric_type', data['fabric_type']).execute()
        
        if not inventory_response.data:
            return jsonify({'success': False, 'error': 'Fabric type not found in inventory'}), 400
        
        available_quantity = float(inventory_response.data[0]['quantity_meters'])
        requested_quantity = float(data['quantity_meters'])
        
        if available_quantity < requested_quantity:
            return jsonify({
                'success': False,
                'error': f'Insufficient stock. Available: {available_quantity} meters, Requested: {requested_quantity} meters'
            }), 400
        
        # Calculate total amount
        total_amount = float(data['quantity_meters']) * float(data['rate_per_meter'])
        
        # Create order
        order_data = {
            'customer_id': data['customer_id'],
            'fabric_type': data['fabric_type'],
            'quantity_meters': data['quantity_meters'],
            'rate_per_meter': data['rate_per_meter'],
            'total_amount': total_amount,
            'status': 'Pending',
            'notes': data.get('notes', '')
        }
        
        order_response = supabase.table('orders').insert(order_data).execute()
        
        # Update inventory (reduce stock)
        new_quantity = available_quantity - requested_quantity
        inventory_id = inventory_response.data[0]['id']
        
        supabase.table('inventory').update({
            'quantity_meters': new_quantity,
            'last_updated': datetime.now().isoformat()
        }).eq('id', inventory_id).execute()
        
        return jsonify({
            'success': True,
            'message': 'Order created successfully',
            'data': order_response.data[0]
        }), 201
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/<order_id>', methods=['PUT'])
def update_order(order_id):
    """Update order"""
    try:
        data = request.get_json()
        
        # Check if order exists
        existing = supabase.table('orders').select('*').eq('id', order_id).execute()
        if not existing.data:
            return jsonify({'success': False, 'error': 'Order not found'}), 404
        
        # Update order
        update_data = {}
        if 'status' in data:
            update_data['status'] = data['status']
        if 'notes' in data:
            update_data['notes'] = data['notes']
        
        response = supabase.table('orders').update(update_data).eq('id', order_id).execute()
        
        return jsonify({
            'success': True,
            'message': 'Order updated successfully',
            'data': response.data[0]
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/<order_id>', methods=['DELETE'])
def cancel_order(order_id):
    """Cancel/delete order and restore inventory"""
    try:
        # Get order details
        order_response = supabase.table('orders').select('*').eq('id', order_id).execute()
        
        if not order_response.data:
            return jsonify({'success': False, 'error': 'Order not found'}), 404
        
        order = order_response.data[0]
        
        # Restore inventory if order was pending
        if order['status'] == 'Pending':
            inventory_response = supabase.table('inventory').select('*').eq('fabric_type', order['fabric_type']).execute()
            
            if inventory_response.data:
                inventory_id = inventory_response.data[0]['id']
                current_quantity = float(inventory_response.data[0]['quantity_meters'])
                restored_quantity = current_quantity + float(order['quantity_meters'])
                
                supabase.table('inventory').update({
                    'quantity_meters': restored_quantity,
                    'last_updated': datetime.now().isoformat()
                }).eq('id', inventory_id).execute()
        
        # Delete order
        supabase.table('orders').delete().eq('id', order_id).execute()
        
        return jsonify({
            'success': True,
            'message': 'Order cancelled and inventory restored'
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/check-availability', methods=['POST'])
def check_availability():
    """Check stock availability for an order"""
    try:
        data = request.get_json()
        
        fabric_type = data.get('fabric_type')
        quantity = float(data.get('quantity_meters', 0))
        
        if not fabric_type or quantity <= 0:
            return jsonify({'success': False, 'error': 'Invalid input'}), 400
        
        # Check inventory
        response = supabase.table('inventory').select('*').eq('fabric_type', fabric_type).execute()
        
        if not response.data:
            return jsonify({
                'success': True,
                'available': False,
                'message': 'Fabric type not found'
            }), 200
        
        available_quantity = float(response.data[0]['quantity_meters'])
        rate = float(response.data[0]['rate_per_meter'])
        
        return jsonify({
            'success': True,
            'available': available_quantity >= quantity,
            'available_quantity': available_quantity,
            'requested_quantity': quantity,
            'rate_per_meter': rate,
            'estimated_amount': quantity * rate
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
