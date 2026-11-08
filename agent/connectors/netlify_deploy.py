import os
import requests
import zipfile
import io
from typing import Dict, Any, Optional

NETLIFY_API_BASE = "https://api.netlify.com/api/v1"

def deploy_client_demo_netlify(
    site_name: str,
    html_content: str,
    token: Optional[str] = None
) -> Dict[str, Any]:
    """
    Genuine Netlify deployment for client demo prototypes.
    Zips index.html and deploys directly to Netlify edge, returning verified HTTPS URL.
    """
    api_token = token or os.environ.get("NETLIFY_TOKEN")
    if not api_token:
        raise ValueError("Netlify personal access token missing. Connect Netlify in Connectors Marketplace.")

    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/zip"
    }

    # Package clean HTML into zip in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("index.html", html_content)
    zip_buffer.seek(0)

    # 1. Check or create site
    site_id = os.environ.get("NETLIFY_SITE_ID")
    if not site_id:
        create_res = requests.post(
            f"{NETLIFY_API_BASE}/sites",
            headers={"Authorization": f"Bearer {api_token}", "Content-Type": "application/json"},
            json={"name": site_name.lower().replace(" ", "-")[:32]},
            timeout=20
        )
        if create_res.ok:
            site_id = create_res.json().get("id")
        else:
            raise RuntimeError(f"Failed to create Netlify demo site: {create_res.status_code} - {create_res.text}")

    # 2. Deploy zip
    deploy_res = requests.post(
        f"{NETLIFY_API_BASE}/sites/{site_id}/deploys",
        headers=headers,
        data=zip_buffer.getvalue(),
        timeout=30
    )

    if not deploy_res.ok:
        raise RuntimeError(f"Netlify deploy failed: {deploy_res.status_code} - {deploy_res.text}")

    deploy_data = deploy_res.json()
    ssl_url = deploy_data.get("ssl_url") or deploy_data.get("url")

    return {
        "success": True,
        "site_id": site_id,
        "deploy_id": deploy_data.get("id"),
        "live_url": ssl_url,
        "deployed_at": deploy_data.get("created_at")
    }
