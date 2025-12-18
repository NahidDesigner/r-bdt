import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface OrderEmailData {
  tenantEmail: string;
  tenantName: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  productName: string;
  quantity: number;
  subtotal: string;
  shippingFee: string;
  total: string;
  shippingLocation: string;
}

export async function sendNewOrderEmail(data: OrderEmailData): Promise<boolean> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("SMTP not configured, skipping email notification");
    return false;
  }

  try {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .order-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .row:last-child { border-bottom: none; }
    .label { color: #6b7280; }
    .value { font-weight: 600; }
    .total-row { background: #3b82f6; color: white; padding: 15px; border-radius: 8px; margin-top: 15px; }
    .customer-info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Order Received!</h1>
      <p>Order #${data.orderNumber}</p>
    </div>
    <div class="content">
      <p>Hello ${data.tenantName},</p>
      <p>Great news! You have received a new order. Here are the details:</p>
      
      <div class="order-details">
        <h3>Order Details</h3>
        <div class="row">
          <span class="label">Product</span>
          <span class="value">${data.productName}</span>
        </div>
        <div class="row">
          <span class="label">Quantity</span>
          <span class="value">${data.quantity}</span>
        </div>
        <div class="row">
          <span class="label">Subtotal</span>
          <span class="value">৳${data.subtotal}</span>
        </div>
        <div class="row">
          <span class="label">Shipping (${data.shippingLocation})</span>
          <span class="value">৳${data.shippingFee}</span>
        </div>
      </div>
      
      <div class="total-row">
        <div style="display: flex; justify-content: space-between;">
          <span>Total (COD)</span>
          <span style="font-size: 1.25rem; font-weight: bold;">৳${data.total}</span>
        </div>
      </div>
      
      <div class="customer-info">
        <h3>Customer Information</h3>
        <div class="row">
          <span class="label">Name</span>
          <span class="value">${data.customerName}</span>
        </div>
        <div class="row">
          <span class="label">Phone</span>
          <span class="value">${data.customerPhone}</span>
        </div>
        <div class="row">
          <span class="label">Address</span>
          <span class="value">${data.customerAddress}</span>
        </div>
      </div>
      
      <p>Please confirm and process this order from your dashboard.</p>
    </div>
    <div class="footer">
      <p>This email was sent by StoreBuilder BD</p>
    </div>
  </div>
</body>
</html>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: data.tenantEmail,
      subject: `New Order #${data.orderNumber} - ${data.productName}`,
      html,
    });

    console.log(`Order notification email sent to ${data.tenantEmail}`);
    return true;
  } catch (error) {
    console.error("Failed to send order notification email:", error);
    return false;
  }
}
