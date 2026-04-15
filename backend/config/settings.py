from datetime import timedelta
from pathlib import Path
from urllib.parse import urlparse

import environ
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    ACCESS_TOKEN_MINUTES=(int, 30),
    REFRESH_TOKEN_DAYS=(int, 7),
    PAGE_SIZE=(int, 20),
    CORS_ALLOW_ALL_ORIGINS=(bool, False),
)
environ.Env.read_env(BASE_DIR / ".env")

DEBUG = env("DEBUG")
SECRET_KEY = env("SECRET_KEY")
DJANGO_ENV = env("DJANGO_ENV", default="development")
allowed_hosts = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])
for hostname in (
    env("RENDER_EXTERNAL_HOSTNAME", default=""),
    env("RAILWAY_PUBLIC_DOMAIN", default=""),
):
    if hostname and hostname not in allowed_hosts:
        allowed_hosts.append(hostname)

backend_public_url = env("BACKEND_PUBLIC_URL", default="")
if backend_public_url:
    parsed_backend_url = urlparse(backend_public_url)
    if parsed_backend_url.hostname and parsed_backend_url.hostname not in allowed_hosts:
        allowed_hosts.append(parsed_backend_url.hostname)

ALLOWED_HOSTS = allowed_hosts

INSTALLED_APPS = [
    "corsheaders",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "django_filters",
    "apps.core.apps.CoreConfig",
    "apps.accounts.apps.AccountsConfig",
    "apps.buyers.apps.BuyersConfig",
    "apps.production_lines.apps.ProductionLinesConfig",
    "apps.orders.apps.OrdersConfig",
    "apps.production.apps.ProductionConfig",
    "apps.inventory.apps.InventoryConfig",
    "apps.productivity.apps.ProductivityConfig",
    "apps.quality.apps.QualityConfig",
    "apps.planning.apps.PlanningConfig",
    "apps.dashboard.apps.DashboardConfig",
    "apps.reports.apps.ReportsConfig",
    "apps.crm.apps.CRMConfig",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

if env("DATABASE_URL", default=""):
    DATABASES = {"default": env.db("DATABASE_URL")}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": env("POSTGRES_DB", default="factory_db"),
            "USER": env("POSTGRES_USER", default="postgres"),
            "PASSWORD": env("POSTGRES_PASSWORD", default="postgres"),
            "HOST": env("POSTGRES_HOST", default="localhost"),
            "PORT": env("POSTGRES_PORT", default="5432"),
        }
    }
DATABASES["default"]["CONN_MAX_AGE"] = env.int("DB_CONN_MAX_AGE", default=60)
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True
if DATABASES["default"].get("ENGINE") == "django.db.backends.postgresql":
    db_options = DATABASES["default"].setdefault("OPTIONS", {})
    db_options.setdefault("connect_timeout", env.int("DB_CONNECT_TIMEOUT", default=10))

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = env("TIME_ZONE", default="Asia/Kolkata")
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
if not DEBUG:
    STORAGES = {
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
    }

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"

def _clean_list(values):
    cleaned = []
    for value in values:
        item = value.strip()
        if item and item not in cleaned:
            cleaned.append(item)
    return cleaned


CORS_ALLOWED_ORIGINS = _clean_list(
    env.list(
        "CORS_ALLOWED_ORIGINS",
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
    )
)
CORS_ALLOWED_ORIGIN_REGEXES = _clean_list(env.list("CORS_ALLOWED_ORIGIN_REGEXES", default=[]))
CORS_ALLOW_ALL_ORIGINS = env.bool("CORS_ALLOW_ALL_ORIGINS", default=False)
CSRF_TRUSTED_ORIGINS = _clean_list(env.list("CSRF_TRUSTED_ORIGINS", default=[]))

# Optional convenience variable to keep frontend origin config in one place.
frontend_app_urls = _clean_list(env.list("FRONTEND_APP_URLS", default=[]))
for frontend_url in frontend_app_urls:
    if frontend_url not in CORS_ALLOWED_ORIGINS:
        CORS_ALLOWED_ORIGINS.append(frontend_url)
    if frontend_url not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(frontend_url)

# Local development defaults to prevent accidental CORS lockouts.
if DEBUG:
    for local_origin in ("http://localhost:3000", "http://127.0.0.1:3000"):
        if local_origin not in CORS_ALLOWED_ORIGINS:
            CORS_ALLOWED_ORIGINS.append(local_origin)
        if local_origin not in CSRF_TRUSTED_ORIGINS:
            CSRF_TRUSTED_ORIGINS.append(local_origin)

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = env.bool("USE_X_FORWARDED_HOST", default=True)
IS_PRODUCTION = DJANGO_ENV.lower() == "production" or not DEBUG

database_url_value = env("DATABASE_URL", default="")
if database_url_value:
    parsed_db_url = urlparse(database_url_value)
    if parsed_db_url.hostname == "host":
        raise ImproperlyConfigured(
            "DATABASE_URL is using placeholder host 'host'. "
            "Set DATABASE_URL to a real PostgreSQL URL from your provider (Render managed database)."
        )
else:
    postgres_host = env("POSTGRES_HOST", default="").strip().lower()
    if postgres_host == "host":
        raise ImproperlyConfigured(
            "POSTGRES_HOST is set to placeholder value 'host'. "
            "Use a real DB host or set DATABASE_URL."
        )

SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=IS_PRODUCTION)
SESSION_COOKIE_SECURE = env.bool("SESSION_COOKIE_SECURE", default=IS_PRODUCTION)
CSRF_COOKIE_SECURE = env.bool("CSRF_COOKIE_SECURE", default=IS_PRODUCTION)
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=(31536000 if IS_PRODUCTION else 0))
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", default=IS_PRODUCTION)
SECURE_HSTS_PRELOAD = env.bool("SECURE_HSTS_PRELOAD", default=IS_PRODUCTION)

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": env("PAGE_SIZE"),
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env("ACCESS_TOKEN_MINUTES")),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env("REFRESH_TOKEN_DAYS")),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "UPDATE_LAST_LOGIN": True,
}
