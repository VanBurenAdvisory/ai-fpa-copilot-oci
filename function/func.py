import io
import json
import os
import base64

from fdk import response
import oci
from openai import OpenAI


def get_openai_api_key():
    secret_ocid = os.environ["OPENAI_SECRET_OCID"]

    signer = oci.auth.signers.get_resource_principals_signer()
    secrets_client = oci.secrets.SecretsClient(config={}, signer=signer)

    bundle = secrets_client.get_secret_bundle(secret_id=secret_ocid).data
    base64_secret = bundle.secret_bundle_content.content
    return base64.b64decode(base64_secret).decode("utf-8")


def build_prompt(company_name, months, questions):
    sample = json.dumps(months[:12], indent=2)

    return f"""
You are a senior FP&A advisor.

Analyze the following company data for {company_name}.

Questions:
{json.dumps(questions, indent=2)}

Financial data sample:
{sample}

Return valid JSON only with this shape:
{{
  "executive_summary": "string",
  "key_drivers": ["string", "string", "string"],
  "risks": ["string", "string", "string"],
  "scenarios": {{
    "base": "string",
    "upside": "string",
    "downside": "string"
  }}
}}
""".strip()


def handler(ctx, data: io.BytesIO = None):
    try:
        body = json.loads(data.getvalue())
        company_name = body.get("company_name", "DemoCo")
        months = body.get("months", [])
        questions = body.get("questions", [])

        if not months:
            return response.Response(
                ctx,
                response_data=json.dumps({"error": "No financial data provided."}),
                headers={"Content-Type": "application/json"},
                status_code=400
            )

        api_key = get_openai_api_key()
        client = OpenAI(api_key=api_key)

        prompt = build_prompt(company_name, months, questions)

        ai_response = client.responses.create(
            model="gpt-5.4",
            input=prompt
        )

        text = ai_response.output_text
        parsed = json.loads(text)

        return response.Response(
            ctx,
            response_data=json.dumps(parsed),
            headers={
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            status_code=200
        )

    except Exception as ex:
        return response.Response(
            ctx,
            response_data=json.dumps({"error": str(ex)}),
            headers={
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            status_code=500
        )