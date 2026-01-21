# PDF Bill Generator using ReportLab
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib import colors
from datetime import datetime
import os

def generate_bill_pdf(bill_data):
    """
    Generate a PDF bill for R.K. Textiles
    
    Args:
        bill_data: Dictionary containing bill information
        
    Returns:
        str: Path to the generated PDF file
    """
    try:
        # Create bills directory if it doesn't exist
        bills_dir = os.path.join(os.path.dirname(__file__), '..', 'bills')
        os.makedirs(bills_dir, exist_ok=True)
        
        # Generate filename
        bill_number = bill_data['bill_number']
        filename = f"{bill_number}.pdf"
        filepath = os.path.join(bills_dir, filename)
        
        # Create PDF document
        doc = SimpleDocTemplate(filepath, pagesize=A4)
        story = []
        
        # Styles
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a1a1a'),
            alignment=TA_CENTER,
            spaceAfter=12
        )
        
        company_style = ParagraphStyle(
            'CompanyStyle',
            parent=styles['Normal'],
            fontSize=10,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#666666')
        )
        
        heading_style = ParagraphStyle(
            'HeadingStyle',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#333333'),
            spaceAfter=12
        )
        
        # Company Header
        story.append(Paragraph("R.K. TEXTILES", title_style))
        story.append(Paragraph("Cotton Fabric Specialists", company_style))
        story.append(Paragraph("Phone: +91-XXXXXXXXXX | Working Hours: 9:00 AM - 8:00 PM", company_style))
        story.append(Spacer(1, 0.3*inch))
        
        # Bill Info
        story.append(Paragraph("TAX INVOICE", heading_style))
        
        # Bill details table
        bill_info_data = [
            ['Bill Number:', bill_number, 'Date:', datetime.fromisoformat(bill_data['bill_date']).strftime('%d-%m-%Y')],
            ['Customer:', bill_data['customers']['name'], 'Phone:', bill_data['customers']['phone']],
        ]
        
        if bill_data['customers'].get('business_type'):
            bill_info_data.append(['Business Type:', bill_data['customers']['business_type'], '', ''])
        
        bill_info_table = Table(bill_info_data, colWidths=[1.5*inch, 2.5*inch, 1*inch, 2*inch])
        bill_info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#333333')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        story.append(bill_info_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Order details
        story.append(Paragraph("Order Details", heading_style))
        
        order = bill_data['orders']
        
        order_data = [
            ['Description', 'Quantity (meters)', 'Rate/Meter', 'Amount'],
            [
                order['fabric_type'],
                f"{float(order['quantity_meters']):.2f}",
                f"₹{float(order['rate_per_meter']):.2f}",
                f"₹{float(order['total_amount']):.2f}"
            ]
        ]
        
        order_table = Table(order_data, colWidths=[3*inch, 1.5*inch, 1.5*inch, 1.5*inch])
        order_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4A90E2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#CCCCCC')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        story.append(order_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Amount summary
        subtotal = float(bill_data['subtotal'])
        gst_amount = float(bill_data['gst_amount'])
        total = float(bill_data['total_amount'])
        
        summary_data = [
            ['', '', 'Subtotal:', f"₹{subtotal:.2f}"],
        ]
        
        if gst_amount > 0:
            gst_percent = (gst_amount / subtotal) * 100
            summary_data.append(['', '', f'GST ({gst_percent:.0f}%):', f"₹{gst_amount:.2f}"])
        
        summary_data.append(['', '', 'Total Amount:', f"₹{total:.2f}"])
        
        summary_table = Table(summary_data, colWidths=[3*inch, 1.5*inch, 1.5*inch, 1.5*inch])
        summary_table.setStyle(TableStyle([
            ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (2, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (2, 0), (-1, -1), 11),
            ('FONTNAME', (2, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (2, -1), (-1, -1), 13),
            ('TEXTCOLOR', (2, -1), (-1, -1), colors.HexColor('#E74C3C')),
            ('LINEABOVE', (2, -1), (-1, -1), 2, colors.HexColor('#333333')),
            ('BACKGROUND', (2, -1), (-1, -1), colors.HexColor('#F8F8F8')),
        ]))
        
        story.append(summary_table)
        story.append(Spacer(1, 0.5*inch))
        
        # Payment status
        payment_status = bill_data['payment_status']
        payment_color = colors.HexColor('#27AE60') if payment_status == 'Paid' else colors.HexColor('#E74C3C')
        
        payment_style = ParagraphStyle(
            'PaymentStyle',
            parent=styles['Normal'],
            fontSize=12,
            textColor=payment_color,
            alignment=TA_CENTER
        )
        
        story.append(Paragraph(f"Payment Status: <b>{payment_status.upper()}</b>", payment_style))
        story.append(Spacer(1, 0.5*inch))
        
        # Footer
        footer_style = ParagraphStyle(
            'FooterStyle',
            parent=styles['Normal'],
            fontSize=9,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#999999')
        )
        
        story.append(Paragraph("Thank you for your business!", footer_style))
        story.append(Paragraph("For any queries, please contact us during working hours.", footer_style))
        
        # Build PDF
        doc.build(story)
        
        return filepath
        
    except Exception as e:
        print(f"Error generating PDF: {str(e)}")
        return None
