# Reports and Analytics Routes
from flask import Blueprint, request, jsonify
from services.supabase_client import get_supabase
from datetime import datetime, timedelta
from collections import defaultdict

bp = Blueprint('reports', __name__)
supabase = get_supabase()

@bp.route('/sales', methods=['GET'])
def get_sales_report():
    """Get sales report for a date range"""
    try:
        # Get date range from query params
        from_date = request.args.get('from_date', (datetime.now() - timedelta(days=30)).isoformat())
        to_date = request.args.get('to_date', datetime.now().isoformat())
        
        # Get orders in date range
        orders = supabase.table('orders').select('*, customers(name, business_type)').gte('order_date', from_date).lte('order_date', to_date).execute()
        
        # Calculate statistics
        total_orders = len(orders.data)
        total_revenue = sum(float(order['total_amount']) for order in orders.data)
        
        # Group by fabric type
        fabric_sales = defaultdict(lambda: {'quantity': 0, 'revenue': 0, 'orders': 0})
        
        for order in orders.data:
            fabric_type = order['fabric_type']
            fabric_sales[fabric_type]['quantity'] += float(order['quantity_meters'])
            fabric_sales[fabric_type]['revenue'] += float(order['total_amount'])
            fabric_sales[fabric_type]['orders'] += 1
        
        # Convert to list
        fabric_breakdown = [
            {
                'fabric_type': fabric,
                'quantity_meters': round(stats['quantity'], 2),
                'revenue': round(stats['revenue'], 2),
                'orders': stats['orders']
            }
            for fabric, stats in fabric_sales.items()
        ]
        
        # Sort by revenue
        fabric_breakdown.sort(key=lambda x: x['revenue'], reverse=True)
        
        # Group by business type
        business_sales = defaultdict(lambda: {'orders': 0, 'revenue': 0})
        
        for order in orders.data:
            business_type = order['customers']['business_type'] or 'Unknown'
            business_sales[business_type]['orders'] += 1
            business_sales[business_type]['revenue'] += float(order['total_amount'])
        
        business_breakdown = [
            {
                'business_type': btype,
                'orders': stats['orders'],
                'revenue': round(stats['revenue'], 2)
            }
            for btype, stats in business_sales.items()
        ]
        
        return jsonify({
            'success': True,
            'data': {
                'period': {'from': from_date, 'to': to_date},
                'summary': {
                    'total_orders': total_orders,
                    'total_revenue': round(total_revenue, 2),
                    'average_order_value': round(total_revenue / total_orders, 2) if total_orders > 0 else 0
                },
                'fabric_breakdown': fabric_breakdown,
                'business_breakdown': business_breakdown
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/inventory', methods=['GET'])
def get_inventory_report():
    """Get inventory status report"""
    try:
        inventory = supabase.table('inventory').select('*').execute()
        
        total_items = len(inventory.data)
        total_meters = sum(float(item['quantity_meters']) for item in inventory.data)
        total_value = sum(float(item['quantity_meters']) * float(item['rate_per_meter']) for item in inventory.data)
        
        # Categorize by stock level
        in_stock = [item for item in inventory.data if float(item['quantity_meters']) >= 50]
        low_stock = [item for item in inventory.data if 10 <= float(item['quantity_meters']) < 50]
        out_of_stock = [item for item in inventory.data if float(item['quantity_meters']) < 10]
        
        # Group by fabric color
        color_distribution = defaultdict(lambda: {'quantity': 0, 'value': 0})
        
        for item in inventory.data:
            color = item['fabric_color']
            color_distribution[color]['quantity'] += float(item['quantity_meters'])
            color_distribution[color]['value'] += float(item['quantity_meters']) * float(item['rate_per_meter'])
        
        color_breakdown = [
            {
                'color': color,
                'quantity_meters': round(stats['quantity'], 2),
                'value': round(stats['value'], 2)
            }
            for color, stats in color_distribution.items()
        ]
        
        return jsonify({
            'success': True,
            'data': {
                'summary': {
                    'total_items': total_items,
                    'total_meters': round(total_meters, 2),
                    'total_value': round(total_value, 2)
                },
                'stock_levels': {
                    'in_stock': len(in_stock),
                    'low_stock': len(low_stock),
                    'out_of_stock': len(out_of_stock)
                },
                'color_breakdown': color_breakdown,
                'low_stock_items': low_stock,
                'out_of_stock_items': out_of_stock
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/customers', methods=['GET'])
def get_customer_report():
    """Get customer analytics report"""
    try:
        customers = supabase.table('customers').select('*, orders(total_amount)').execute()
        
        total_customers = len(customers.data)
        
        # Calculate customer value
        customer_analysis = []
        
        for customer in customers.data:
            orders = customer.get('orders', [])
            total_spent = sum(float(order['total_amount']) for order in orders)
            order_count = len(orders)
            
            customer_analysis.append({
                'customer_id': customer['id'],
                'name': customer['name'],
                'phone': customer['phone'],
                'business_type': customer['business_type'],
                'total_orders': order_count,
                'total_spent': round(total_spent, 2),
                'average_order_value': round(total_spent / order_count, 2) if order_count > 0 else 0
            })
        
        # Sort by total spent
        customer_analysis.sort(key=lambda x: x['total_spent'], reverse=True)
        
        # Top 10 customers
        top_customers = customer_analysis[:10]
        
        # Business type distribution
        business_distribution = defaultdict(int)
        for customer in customers.data:
            btype = customer['business_type'] or 'Unknown'
            business_distribution[btype] += 1
        
        business_breakdown = [
            {'business_type': btype, 'count': count}
            for btype, count in business_distribution.items()
        ]
        
        return jsonify({
            'success': True,
            'data': {
                'summary': {
                    'total_customers': total_customers
                },
                'top_customers': top_customers,
                'business_distribution': business_breakdown
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/dashboard', methods=['GET'])
def get_dashboard_stats():
    """Get overall dashboard statistics"""
    try:
        # Get counts
        customers = supabase.table('customers').select('id').execute()
        orders = supabase.table('orders').select('total_amount, status').execute()
        inventory = supabase.table('inventory').select('quantity_meters, rate_per_meter').execute()
        bills = supabase.table('bills').select('total_amount, payment_status').execute()
        
        # Calculate stats
        total_customers = len(customers.data)
        total_orders = len(orders.data)
        pending_orders = len([o for o in orders.data if o['status'] == 'Pending'])
        
        total_revenue = sum(float(bill['total_amount']) for bill in bills.data)
        pending_payments = sum(float(bill['total_amount']) for bill in bills.data if bill['payment_status'] == 'Pending')
        
        total_inventory_value = sum(float(item['quantity_meters']) * float(item['rate_per_meter']) for item in inventory.data)
        low_stock_count = len([item for item in inventory.data if float(item['quantity_meters']) < 50])
        
        # Recent orders (last 5)
        recent_orders = supabase.table('orders').select('*, customers(name)').order('order_date', desc=True).limit(5).execute()
        
        return jsonify({
            'success': True,
            'data': {
                'customers': {
                    'total': total_customers
                },
                'orders': {
                    'total': total_orders,
                    'pending': pending_orders
                },
                'revenue': {
                    'total': round(total_revenue, 2),
                    'pending_payments': round(pending_payments, 2)
                },
                'inventory': {
                    'total_value': round(total_inventory_value, 2),
                    'low_stock_items': low_stock_count
                },
                'recent_orders': recent_orders.data
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
