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
    
    Args:
        token: Bearer JWT token string.
        
    Returns:
        dict: The decoded token claims (claims include 'sub' as Clerk user_id).
        
    Raises:
        TokenVerificationError: If decoding fails or signature is invalid.
    """
    try:
        jwk_client = get_jwk_client()
        signing_key = jwk_client.get_signing_key_from_jwt(token)
        
        # Verify and decode
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={
                "verify_aud": False,  # Clerk tokens aud is usually not set or matches host
                "verify_exp": True,
            }
        )
        return payload
    except jwt.PyJWKClientError as e:
        logger.error(f"JWKS Client failure: {e}")
        raise TokenVerificationError(f"Authentication services configuration error: {e}")
    except jwt.ExpiredSignatureError as e:
        logger.warning(f"Expired JWT token signature: {e}")
        raise TokenVerificationError("Token signature has expired")
    except jwt.PyJWTError as e:
        logger.warning(f"Invalid JWT token decoding failure: {e}")
        raise TokenVerificationError(f"Invalid token signature: {e}")
