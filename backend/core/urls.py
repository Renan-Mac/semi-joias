from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import ProdutoViewSet, ClienteViewSet, VendaViewSet, me, analytics_dashboard


router = DefaultRouter()
router.register("produtos", ProdutoViewSet, basename="produtos")
router.register("clientes", ClienteViewSet, basename="clientes")
router.register("vendas", VendaViewSet, basename="vendas")

urlpatterns = [
    path("auth/login/", TokenObtainPairView.as_view(), name="token_obtain"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/me/", me, name="auth_me"),
    path("analytics/dashboard/", analytics_dashboard, name="analytics_dashboard"),
    path("", include(router.urls)),
]
