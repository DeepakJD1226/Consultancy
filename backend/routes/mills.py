# Mill Management Routes
from flask import Blueprint, request, jsonify
from services.supabase_client import get_supabase
from datetime import datetime

bp = Blueprint('mills', __name__)
supabase = get_supabase()

@bp.route('', methods=['GET'])
def get_mills():
    """Get all mills"""
    try:
        response = supabase.table('mills').select('*').order('mill_name').execute()
        
        return jsonify({
            'success': True,
            'data': response.data,
            'count': len(response.data)
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/<mill_id>', methods=['GET'])
def get_mill(mill_id):
    """Get single mill by ID"""
    try:
        response = supabase.table('mills').select('*').eq('id', mill_id).execute()
        
        if not response.data:
            return jsonify({'success': False, 'error': 'Mill not found'}), 404
        
        return jsonify({
            'success': True,
            'data': response.data[0]
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('', methods=['POST'])
def create_mill():
    """Add new mill"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if 'mill_name' not in data:
            return jsonify({'success': False, 'error': 'mill_name is required'}), 400
        
        mill_data = {
            'mill_name': data['mill_name'],
            'location': data.get('location', ''),
            'contact_person': data.get('contact_person', ''),
            'phone': data.get('phone', '')
        }
        
        response = supabase.table('mills').insert(mill_data).execute()
        
        return jsonify({
            'success': True,
            'message': 'Mill added successfully',
            'data': response.data[0]
        }), 201
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/raw-materials', methods=['GET'])
def get_raw_materials():
    """Get all raw material records"""
    try:
        mill_id = request.args.get('mill_id', '')
        status = request.args.get('status', '')
        
        query = supabase.table('raw_materials').select('*, mills(mill_name)')
        
        if mill_id:
            query = query.eq('mill_id', mill_id)
        
        if status:
            query = query.eq('status', status)
        
        response = query.order('sent_date', desc=True).execute()
        
        return jsonify({
            'success': True,
            'data': response.data,
            'count': len(response.data)
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/raw-materials', methods=['POST'])
def send_raw_materials():
    """Send raw materials to mill"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['mill_id', 'material_type', 'quantity_kg']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'{field} is required'}), 400
        
        raw_material_data = {
            'mill_id': data['mill_id'],
            'material_type': data['material_type'],
            'quantity_kg': data['quantity_kg'],
            'status': 'In Production'
        }
        
        response = supabase.table('raw_materials').insert(raw_material_data).execute()
        
        return jsonify({
            'success': True,
            'message': 'Raw materials sent to mill successfully',
            'data': response.data[0]
        }), 201
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/raw-materials/<material_id>', methods=['PUT'])
def update_raw_material(material_id):
    """Update raw material production status"""
    try:
        data = request.get_json()
        
        # Check if material exists
        existing = supabase.table('raw_materials').select('*').eq('id', material_id).execute()
        if not existing.data:
            return jsonify({'success': False, 'error': 'Raw material record not found'}), 404
        
        update_data = {}
        
        if 'status' in data:
            update_data['status'] = data['status']
        
        if 'fabric_received_meters' in data:
            update_data['fabric_received_meters'] = data['fabric_received_meters']
            update_data['received_date'] = datetime.now().isoformat()
            update_data['status'] = 'Completed'
            
            # Add received fabric to inventory
            material = existing.data[0]
            fabric_type = data.get('fabric_type', 'Cotton Fabric')
            fabric_color = data.get('fabric_color', 'White')
            rate_per_meter = data.get('rate_per_meter', 100)
            
            # Check if fabric exists in inventory
            inventory_check = supabase.table('inventory').select('*').eq('fabric_type', fabric_type).eq('fabric_color', fabric_color).execute()
            
            if inventory_check.data:
                # Update existing inventory
                inventory_id = inventory_check.data[0]['id']
                current_quantity = float(inventory_check.data[0]['quantity_meters'])
                new_quantity = current_quantity + float(data['fabric_received_meters'])
                
                supabase.table('inventory').update({
                    'quantity_meters': new_quantity,
                    'last_updated': datetime.now().isoformat()
                }).eq('id', inventory_id).execute()
            else:
                # Create new inventory item
                supabase.table('inventory').insert({
                    'fabric_type': fabric_type,
                    'fabric_color': fabric_color,
                    'quantity_meters': data['fabric_received_meters'],
                    'rate_per_meter': rate_per_meter,
                    'location': 'Main Warehouse'
                }).execute()
        
        response = supabase.table('raw_materials').update(update_data).eq('id', material_id).execute()
        
        return jsonify({
            'success': True,
            'message': 'Raw material status updated successfully',
            'data': response.data[0]
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/performance', methods=['GET'])
def get_mill_performance():
    """Get mill performance statistics"""
    try:
        # Get all raw material records
        response = supabase.table('raw_materials').select('*, mills(mill_name)').execute()
        
        # Calculate performance per mill
        mill_stats = {}
        
        for record in response.data:
            mill_name = record['mills']['mill_name']
            
            if mill_name not in mill_stats:
                mill_stats[mill_name] = {
                    'mill_name': mill_name,
                    'total_raw_material_kg': 0,
                    'total_fabric_received_meters': 0,
                    'pending_production_count': 0,
                    'completed_count': 0
                }
            
            mill_stats[mill_name]['total_raw_material_kg'] += float(record['quantity_kg'])
            
            if record['status'] == 'Completed' and record.get('fabric_received_meters'):
                mill_stats[mill_name]['total_fabric_received_meters'] += float(record['fabric_received_meters'])
                mill_stats[mill_name]['completed_count'] += 1
            else:
                mill_stats[mill_name]['pending_production_count'] += 1
        
        return jsonify({
            'success': True,
            'data': list(mill_stats.values())
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
