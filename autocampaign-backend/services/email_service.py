import os
import resend
import logging
from urllib.parse import urlparse
from utils.logger import log_resend_dispatch_trace

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def send_campaign_email(
    to_email: str, 
    subject: str, 
    ad_text: str, 
    image_url: str, 
    video_url: str, 
    brand_color: str = "#0088ff", 
    business_name: str = "AutoCampaign Premium Hub",
    website_url: str = None,
    logo_url: str = ""
) -> bool:
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        logger.error("RESEND_API_KEY not found in environment.")
        return False
        
    resend.api_key = api_key
    
    # Ensure brand_color is a valid hex
    if not brand_color or not brand_color.startswith("#"):
        brand_color = "#0088ff"
        
    # Extract domain and fetch high-resolution Clearbit logo dynamically if not provided
    if not logo_url and website_url:
        try:
            parsed = urlparse(website_url)
            domain = parsed.netloc or parsed.path
            if domain.startswith("www."):
                domain = domain[4:]
            domain = domain.split("/")[0]
            if domain:
                logo_url = f"https://logo.clearbit.com/{domain}"
        except Exception as e:
            logger.warning(f"Failed to parse domain from website URL: {e}")

    # Generate initials if logo isn't available
    initial = business_name[0].upper() if business_name else "A"
        
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0f1115; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width: 100%; max-width: 600px; margin: 40px auto; background-color: #1a1d24; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);">
            <!-- Full-width brand-colored gradient header -->
            <tr>
                <td align="center" style="background: linear-gradient(135deg, {brand_color} 0%, #111 100%); padding: 50px 30px 40px 30px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                    <div style="display: inline-block; width: 72px; height: 72px; background-color: #ffffff; border: 2px solid rgba(255, 255, 255, 0.2); border-radius: 50%; overflow: hidden; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); margin-bottom: 16px; vertical-align: middle;">
                        {f'<img src="{logo_url}" width="100%" height="100%" alt="Logo" style="display: block; width: 100%; height: 100%; object-fit: contain;" />' if logo_url else f'<span style="color: {brand_color}; font-size: 32px; font-weight: 800; line-height: 72px;">{initial}</span>'}
                    </div>
                    <h1 style="color: #ffffff; font-size: 26px; font-weight: 900; margin: 0; letter-spacing: 1px; text-transform: uppercase;">{business_name}</h1>
                    <p style="color: rgba(255,255,255,0.7); font-size: 13px; font-weight: 600; margin: 6px 0 0 0; letter-spacing: 2px; text-transform: uppercase;">EXCLUSIVE COLLECTION</p>
                </td>
            </tr>
            
            <tr>
                <td style="padding: 40px 35px 30px 35px;">
                    <!-- Ad Copy Typography Block in Visually Separated Card Section -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #232730; border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 18px; margin-bottom: 35px; overflow: hidden;">
                        <tr>
                            <td style="padding: 24px; text-align: center;">
                                <h2 style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.4; font-family: Georgia, serif;">
                                    Introducing Our Latest Strategy
                                </h2>
                                <p style="font-size: 15px; line-height: 1.7; color: rgba(255,255,255,0.85); margin: 0; white-space: pre-wrap;">{ad_text}</p>
                            </td>
                        </tr>
                    </table>

                    <!-- Hero Image Block with Rounded Corners and Subtle Shadow -->
                    <div style="background-color: #1a1d24; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 0; margin-bottom: 40px; overflow: hidden; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.25);">
                        <img src="{image_url}" width="100%" alt="Exclusive Campaign Preview" style="display: block; width: 100%; max-width: 100%; height: auto; border: none;" />
                    </div>
                    
                    <!-- Prominent Brand-Colored CTA Button linking to https://insightflow-ai.tech/ -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="text-align: center; margin-bottom: 25px;">
                        <tr>
                            <td align="center">
                                <a href="https://insightflow-ai.tech/" target="_blank" style="display: inline-block; background-color: {brand_color}; color: #ffffff; text-decoration: none; padding: 18px 48px; font-size: 16px; font-weight: 800; border-radius: 35px; text-align: center; box-shadow: 0 8px 24px {brand_color}55; text-transform: uppercase; letter-spacing: 1px;">Shop Now — Exclusive Offer</a>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Secondary CTA Link to AI Promo Video -->
                    {f'<p style="font-size: 13px; margin: 0 0 20px 0; line-height: 1.5; color: rgba(255,255,255,0.5); text-align: center;">Or <a href="{video_url}" target="_blank" style="color: {brand_color}; text-decoration: underline; font-weight: 700; letter-spacing: 0.5px;">Watch Our AI Promo Video Here &gt;</a></p>' if video_url else ""}
                </td>
            </tr>
            
            <!-- Clean Modern Footer -->
            <tr>
                <td align="center" style="background-color: #121419; padding: 35px; border-top: 1px solid rgba(255, 255, 255, 0.08); text-align: center;">
                    <p style="color: rgba(255, 255, 255, 0.4); font-size: 11px; font-weight: 700; margin: 0 0 12px 0; letter-spacing: 1px; text-transform: uppercase;">Sent via InsightFlow AI</p>
                    <p style="color: rgba(255, 255, 255, 0.3); font-size: 11px; margin: 0; line-height: 1.6;">
                        You are receiving this promotional email because you are a valued customer of {business_name}.<br>
                        <a href="#" style="color: rgba(255, 255, 255, 0.45); text-decoration: underline; margin-right: 10px;">Unsubscribe</a> | <a href="#" style="color: rgba(255, 255, 255, 0.45); text-decoration: underline; margin-left: 10px;">Manage Preferences</a>
                    </p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    try:
        params: resend.Emails.SendParams = {
            "from": f"{business_name} <onboarding@resend.dev>",
            "to": [to_email],
            "subject": subject,
            "html": html_content,
        }
        
        email = resend.Emails.send(params)
        logger.info(f"Email successfully sent to {to_email}. ID: {email.get('id', 'unknown')}")
        
        log_resend_dispatch_trace(
            recipient_email=to_email,
            status_code=200,
            response_payload={"id": email.get("id", "unknown"), "message": "Email successfully sent via Resend API"}
        )
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        log_resend_dispatch_trace(
            recipient_email=to_email,
            status_code=500,
            response_payload={"error": str(e), "message": "Failed to send email via Resend API"}
        )
        return False
