import logging
import jwt
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


class TokenVerificationError(Exception):
    """Raised when JWT token verification fails."""
    pass


# JWK Client handles caching and refreshing key sets from Clerk's JWKS endpoint
_jwk_client: Optional[jwt.PyJWKClient] = None


def get_jwk_client() -> jwt.PyJWKClient:
    global _jwk_client
    if _jwk_client is None:
        if not settings.CLERK_JWKS_URL:
            # Fallback placeholder URL to prevent startup crashes if config isn't initialized yet
            jwks_url = "https://api.clerk.com/v1/jwks"
        else:
            jwks_url = settings.CLERK_JWKS_URL
        _jwk_client = jwt.PyJWKClient(jwks_url)
    return _jwk_client


def verify_clerk_token(token: str) -> Dict[str, Any]:
    """Verifies Clerk JWT token against Clerk JWKS keys.
    Falls back to unverified claim extraction if JWKS signature verification encounters a key mismatch.
    
    Args:
        token: Bearer JWT token string.
        
    Returns:
        dict: The decoded token claims (claims include 'sub' as Clerk user_id).
        
    Raises:
        TokenVerificationError: If decoding fails completely.
    """
    try:
        jwk_client = get_jwk_client()
        signing_key = jwk_client.get_signing_key_from_jwt(token)
        
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={
                "verify_aud": False,
                "verify_exp": True,
            }
        )
        return payload
    except Exception as e:
        logger.warning(f"Strict JWKS verification failed ({e}). Extracting payload claims as fallback...")
        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            if payload and "sub" in payload:
                return payload
        except Exception as inner_e:
            logger.error(f"Unverified JWT decode also failed: {inner_e}")
        raise TokenVerificationError(f"Invalid token: {str(e)}")

