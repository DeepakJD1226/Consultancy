# Inventory Management Routes
from flask import Blueprint, request, jsonify
from services.supabase_client import get_supabase
from datetime import datetime

bp = Blueprint('inventory', __name__)
supabase = get_supabase()

@bp.route('', methods=['GET'])
def get_inventory():
    """Get all inventory items"""
    try:
        # Query parameters
        fabric_type = request.args.get('fabric_type', '')
        low_stock = request.args.get('low_stock', 'false')
        
        query = supabase.table('inventory').select('*')
        
        if fabric_type:
            query = query.eq('fabric_type', fabric_type)
        
        response = query.order('last_updated', desc=True).execute()
        
        # Filter low stock items if requested
        data = response.data
        if low_stock.lower() == 'true':
            data = [item for item in data if float(item['quantity_meters']) < 50]
        
        return jsonify({
            'success': True,
            'data': data,
            'count': len(data)
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/<inventory_id>', methods=['GET'])
def get_inventory_item(inventory_id):
    """Get single inventory item"""
    try:
        response = supabase.table('inventory').select('*').eq('id', inventory_id).execute()
        
        if not response.data:
            return jsonify({'success': False, 'error': 'Inventory item not found'}), 404
        
        return jsonify({
            'success': True,
            'data': response.data[0]
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('', methods=['POST'])
def add_inventory():
    """Add new inventory item"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['fabric_type', 'fabric_color', 'quantity_meters', 'rate_per_meter']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'{field} is required'}), 400
        
        # Check if fabric already exists
        existing = supabase.table('inventory').select('*').eq('fabric_type', data['fabric_type']).eq('fabric_color', data['fabric_color']).execute()
        
        if existing.data:
            # Update existing quantity
            inventory_id = existing.data[0]['id']
            current_quantity = float(existing.data[0]['quantity_meters'])
            new_quantity = current_quantity + float(data['quantity_meters'])
            
            response = supabase.table('inventory').update({
                'quantity_meters': new_quantity,
                'rate_per_meter': data['rate_per_meter'],
                'last_updated': datetime.now().isoformat()
            }).eq('id', inventory_id).execute()
            
            return jsonify({
                'success': True,
                'message': 'Inventory updated (quantity added)',
                'data': response.data[0]
            }), 200
        else:
            # Create new inventory item
            inventory_data = {
                'fabric_type': data['fabric_type'],
                'fabric_color': data['fabric_color'],
                'quantity_meters': data['quantity_meters'],
                'rate_per_meter': data['rate_per_meter'],
                'location': data.get('location', '')
            }
            
            response = supabase.table('inventory').insert(inventory_data).execute()
            
            return jsonify({
                'success': True,
                'message': 'Inventory item created successfully',
                'data': response.data[0]
            }), 201
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/<inventory_id>', methods=['PUT'])
def update_inventory(inventory_id):
    """Update inventory item"""
    try:
        data = request.get_json()
        
        # Check if item exists
        existing = supabase.table('inventory').select('*').eq('id', inventory_id).execute()
        if not existing.data:
            return jsonify({'success': False, 'error': 'Inventory item not found'}), 404
        
        # Update inventory
        update_data = {'last_updated': datetime.now().isoformat()}
        
        if 'quantity_meters' in data:
            update_data['quantity_meters'] = data['quantity_meters']
        if 'rate_per_meter' in data:
            update_data['rate_per_meter'] = data['rate_per_meter']
        if 'location' in data:
            update_data['location'] = data['location']
        if 'fabric_color' in data:
            update_data['fabric_color'] = data['fabric_color']
        
        response = supabase.table('inventory').update(update_data).eq('id', inventory_id).execute()
        
        return jsonify({
            'success': True,
            'message': 'Inventory updated successfully',
            'data': response.data[0]
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/<inventory_id>', methods=['DELETE'])
def delete_inventory(inventory_id):
    """Delete inventory item"""
    try:
        # Check if item exists
        existing = supabase.table('inventory').select('*').eq('id', inventory_id).execute()
        if not existing.data:
            return jsonify({'success': False, 'error': 'Inventory item not found'}), 404
        
        # Delete inventory
        supabase.table('inventory').delete().eq('id', inventory_id).execute()
        
        return jsonify({
            'success': True,
            'message': 'Inventory item deleted successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/low-stock', methods=['GET'])
def get_low_stock():
    """Get low stock items (< 50 meters)"""
    try:
        response = supabase.table('inventory').select('*').execute()
        
        low_stock_items = [item for item in response.data if float(item['quantity_meters']) < 50]
        
        return jsonify({
            'success': True,
            'data': low_stock_items,
            'count': len(low_stock_items)
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/summary', methods=['GET'])
def get_inventory_summary():
    """Get inventory summary statistics"""
    try:
        response = supabase.table('inventory').select('*').execute()
        
        total_items = len(response.data)
        low_stock_count = len([item for item in response.data if float(item['quantity_meters']) < 50])
        total_meters = sum(float(item['quantity_meters']) for item in response.data)
        total_value = sum(float(item['quantity_meters']) * float(item['rate_per_meter']) for item in response.data)
        
        return jsonify({
            'success': True,
            'data': {
                'total_items': total_items,
                'low_stock_count': low_stock_count,
                'total_meters': round(total_meters, 2),
                'total_value': round(total_value, 2)
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
