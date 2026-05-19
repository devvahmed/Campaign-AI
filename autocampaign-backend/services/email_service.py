import os
import resend
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def send_campaign_email(to_email: str, subject: str, ad_text: str, image_url: str, video_url: str, brand_color: str = "#0088ff", business_name: str = "AutoCampaign Premium Hub") -> bool:
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        logger.error("RESEND_API_KEY not found in environment.")
        return False
        
    resend.api_key = api_key
    
    # Ensure brand_color is a valid hex
    if not brand_color or not brand_color.startswith("#"):
        brand_color = "#0088ff"
        
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>{subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width: 100%; max-width: 600px; margin: 40px auto; font-family: sans-serif; background-color: #ffffff; color: #333333; border: 1px solid #eeeeee; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);">
            <!-- Header Banner -->
            <tr>
                <td align="center" style="background-color: {brand_color}; padding: 35px 20px;">
                    <h1 style="color: #ffffff; font-size: 26px; font-weight: bold; margin: 0; letter-spacing: 0.5px;">{business_name}</h1>
                    <p style="color: #ffffff; opacity: 0.8; font-size: 14px; margin: 6px 0 0 0;">Real-Time Culturally-Integrated Marketing Campaign</p>
                </td>
            </tr>
            
            <!-- Content -->
            <tr>
                <td style="padding: 30px 25px;">
                    <!-- Ad Copy Box -->
                    <h2 style="font-size: 13px; font-weight: bold; text-transform: uppercase; color: #666666; letter-spacing: 0.8px; margin: 0 0 10px 0;">📝 Dynamic Ad Copy</h2>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8fafc; border-left: 4px solid {brand_color}; border-radius: 0 6px 6px 0; margin-bottom: 25px;">
                        <tr>
                            <td style="padding: 16px 20px; font-size: 15px; line-height: 1.6; color: #334155; white-space: pre-wrap;">{ad_text}</td>
                        </tr>
                    </table>
                    
                    <!-- Ad Image Box -->
                    <h2 style="font-size: 13px; font-weight: bold; text-transform: uppercase; color: #666666; letter-spacing: 0.8px; margin: 0 0 10px 0;">📸 Live Campaign Asset</h2>
                    <img src="{image_url}" width="100%" alt="Campaign Image" style="display: block; width: 100%; max-width: 600px; height: auto; border: none; margin: 15px 0; border-radius: 8px;" />
                    
                    <!-- Video Call to Action -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 30px; padding-top: 25px; border-top: 1px solid #f1f5f9; text-align: center;">
                        <tr>
                            <td align="center">
                                <h2 style="font-size: 13px; font-weight: bold; text-transform: uppercase; color: #666666; letter-spacing: 0.8px; margin: 0 0 15px 0;">🎬 Promotional Video</h2>
                                <p style="font-size: 14px; color: #64748b; margin: 0 0 20px 0;">Your premium AI-generated promotional video is ready to view.</p>
                                <a href="{video_url}" target="_blank" style="display: inline-block; background-color: {brand_color}; color: #ffffff; text-decoration: none; padding: 15px 30px; font-size: 15px; font-weight: bold; border-radius: 25px; text-align: center; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);">▶ Watch Full Video</a>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            
            <!-- Footer -->
            <tr>
                <td align="center" style="background-color: #f8fafc; padding: 20px; border-top: 1px solid #eeeeee;">
                    <p style="color: #999999; font-size: 12px; margin: 0;">Powered by InsightFlow AI • AutoCampaign Platform</p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    try:
        # Note: Resend requires a verified domain to send from, 
        # using onboarding@resend.dev works for testing but only to the verified email.
        # We will use "onboarding@resend.dev" as the sender for hackathon purposes.
        params: resend.Emails.SendParams = {
            "from": f"{business_name} <onboarding@resend.dev>",
            "to": [to_email],
            "subject": subject,
            "html": html_content,
        }
        
        email = resend.Emails.send(params)
        logger.info(f"Email successfully sent to {to_email}. ID: {email.get('id', 'unknown')}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return False
