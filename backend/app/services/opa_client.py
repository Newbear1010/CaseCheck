"""OPA (Open Policy Agent) client for policy evaluation."""

from dataclasses import dataclass
from typing import Any
import httpx
from app.core.config import settings


@dataclass
class PolicyDecision:
    """Result of a policy evaluation."""
    allow: bool
    reasons: list[str]
    obligations: dict[str, Any] | None = None


@dataclass
class PolicyInput:
    """Input for policy evaluation."""
    subject: dict
    action: str
    resource: dict
    context: dict


class OPAClient:
    """Client for communicating with OPA server."""

    def __init__(self, opa_url: str | None = None, policy_path: str | None = None) -> None:
        self.opa_url = opa_url or settings.OPA_URL
        self.policy_path = policy_path or settings.OPA_POLICY_PATH

    async def evaluate(self, policy_input: PolicyInput) -> PolicyDecision:
        input_data = {
            "input": {
                "subject": policy_input.subject,
                "action": policy_input.action,
                "resource": policy_input.resource,
                "context": policy_input.context,
            }
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.opa_url}{self.policy_path}",
                    json=input_data,
                    timeout=5.0,
                )
                response.raise_for_status()
                result = response.json().get("result", {})

            if isinstance(result, bool):
                return PolicyDecision(allow=result, reasons=[])

            return PolicyDecision(
                allow=result.get("allow", False),
                reasons=result.get("reasons", []),
                obligations=result.get("obligations"),
            )
        except httpx.HTTPError as exc:
            print(f"OPA evaluation error: {exc}")
            return PolicyDecision(
                allow=False,
                reasons=["Policy evaluation failed - defaulting to deny"],
            )

    async def evaluate_batch(self, inputs: list[PolicyInput]) -> list[PolicyDecision]:
        return [await self.evaluate(inp) for inp in inputs]


opa_client = OPAClient()


async def check_permission(
    user_id: str,
    user_role: str,
    action: str,
    resource: dict | None = None,
    context: dict | None = None,
) -> PolicyDecision:
    policy_input = PolicyInput(
        subject={"id": user_id, "role": user_role},
        action=action,
        resource=resource or {},
        context=context or {},
    )

    return await opa_client.evaluate(policy_input)
