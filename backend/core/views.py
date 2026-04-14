from datetime import datetime, timedelta

from django.db.models import Count, F, Sum, Value, DecimalField
from django.db.models.functions import Coalesce, TruncDate
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Produto, Cliente, Venda
from .serializers import ProdutoSerializer, ClienteSerializer, VendaSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    user = request.user
    return Response({
        "id": user.id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
    })


class ProdutoViewSet(viewsets.ModelViewSet):
    queryset = Produto.objects.all().order_by("-data_de_registro_da_peca")
    serializer_class = ProdutoSerializer


class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all().order_by("nome")
    serializer_class = ClienteSerializer


class VendaViewSet(viewsets.ModelViewSet):
    queryset = Venda.objects.select_related("produto", "cliente").all().order_by("-data_de_registro")
    serializer_class = VendaSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def analytics_dashboard(request):
    start_param = request.query_params.get("start")
    end_param = request.query_params.get("end")

    today = timezone.localdate()
    default_start = today - timedelta(days=29)

    try:
        start_date = datetime.strptime(start_param, "%Y-%m-%d").date() if start_param else default_start
        end_date = datetime.strptime(end_param, "%Y-%m-%d").date() if end_param else today
    except ValueError:
        return Response({"detail": "Parametros de data invalidos. Use YYYY-MM-DD."}, status=400)

    if start_date > end_date:
        return Response({"detail": "A data inicial nao pode ser maior que a final."}, status=400)

    end_exclusive = end_date + timedelta(days=1)

    vendas_periodo = Venda.objects.filter(
        data_de_registro__date__gte=start_date,
        data_de_registro__date__lt=end_exclusive,
    )

    total_faturamento = vendas_periodo.aggregate(
        total=Coalesce(
            Sum(F("valor_de_venda_praticado") * F("quantidade"), output_field=DecimalField(max_digits=14, decimal_places=2)),
            Value(0),
            output_field=DecimalField(max_digits=14, decimal_places=2),
        )
    )["total"]

    total_custo = vendas_periodo.aggregate(
        total=Coalesce(
            Sum(F("valor_de_compra_praticado") * F("quantidade"), output_field=DecimalField(max_digits=14, decimal_places=2)),
            Value(0),
            output_field=DecimalField(max_digits=14, decimal_places=2),
        )
    )["total"]

    total_itens = vendas_periodo.aggregate(total=Coalesce(Sum("quantidade"), 0))["total"]
    total_vendas = vendas_periodo.count()
    ticket_medio = (total_faturamento / total_vendas) if total_vendas else 0
    lucro_total = total_faturamento - total_custo

    faturamento_series = list(
        vendas_periodo.annotate(dia=TruncDate("data_de_registro"))
        .values("dia")
        .annotate(
            faturamento=Coalesce(
                Sum(F("valor_de_venda_praticado") * F("quantidade"), output_field=DecimalField(max_digits=14, decimal_places=2)),
                Value(0),
                output_field=DecimalField(max_digits=14, decimal_places=2),
            ),
            vendas=Count("id"),
            itens=Coalesce(Sum("quantidade"), 0),
        )
        .order_by("dia")
    )

    top_produtos = list(
        vendas_periodo.values("descricao_da_peca")
        .annotate(
            faturamento=Coalesce(
                Sum(F("valor_de_venda_praticado") * F("quantidade"), output_field=DecimalField(max_digits=14, decimal_places=2)),
                Value(0),
                output_field=DecimalField(max_digits=14, decimal_places=2),
            ),
            itens=Coalesce(Sum("quantidade"), 0),
            vendas=Count("id"),
        )
        .order_by("-faturamento", "-itens")[:5]
    )

    categoria_share = list(
        vendas_periodo.values("categoria_da_peca")
        .annotate(
            faturamento=Coalesce(
                Sum(F("valor_de_venda_praticado") * F("quantidade"), output_field=DecimalField(max_digits=14, decimal_places=2)),
                Value(0),
                output_field=DecimalField(max_digits=14, decimal_places=2),
            ),
            itens=Coalesce(Sum("quantidade"), 0),
        )
        .order_by("-faturamento")
    )

    lucro_categoria = list(
        vendas_periodo.values("categoria_da_peca")
        .annotate(
            lucro=Coalesce(
                Sum(
                    (F("valor_de_venda_praticado") - F("valor_de_compra_praticado")) * F("quantidade"),
                    output_field=DecimalField(max_digits=14, decimal_places=2),
                ),
                Value(0),
                output_field=DecimalField(max_digits=14, decimal_places=2),
            )
        )
        .order_by("-lucro")
    )

    top_clientes = list(
        vendas_periodo.values("cliente__nome")
        .annotate(
            faturamento=Coalesce(
                Sum(F("valor_de_venda_praticado") * F("quantidade"), output_field=DecimalField(max_digits=14, decimal_places=2)),
                Value(0),
                output_field=DecimalField(max_digits=14, decimal_places=2),
            ),
            itens=Coalesce(Sum("quantidade"), 0),
            compras=Count("id"),
        )
        .order_by("-faturamento", "-compras")[:5]
    )

    return Response(
        {
            "periodo": {"start": start_date.isoformat(), "end": end_date.isoformat()},
            "kpis": {
                "faturamento": total_faturamento,
                "custo": total_custo,
                "lucro": lucro_total,
                "ticket_medio": ticket_medio,
                "vendas": total_vendas,
                "itens_vendidos": total_itens,
            },
            "faturamento_series": faturamento_series,
            "top_produtos": top_produtos,
            "categoria_share": categoria_share,
            "lucro_categoria": lucro_categoria,
            "top_clientes": top_clientes,
        }
    )
