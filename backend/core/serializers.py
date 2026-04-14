from rest_framework import serializers
from .models import Produto, Cliente, Venda


class ProdutoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Produto
        fields = "__all__"


class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = "__all__"


class VendaSerializer(serializers.ModelSerializer):
    produto_id = serializers.PrimaryKeyRelatedField(source="produto", queryset=Produto.objects.all(), write_only=True)
    cliente_id = serializers.PrimaryKeyRelatedField(source="cliente", queryset=Cliente.objects.all(), write_only=True)
    valor_de_venda_praticado = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    cliente_nome = serializers.CharField(source="cliente.nome", read_only=True)

    class Meta:
        model = Venda
        fields = [
            "id",
            "produto_id",
            "cliente_id",
            "cliente_nome",
            "quantidade",
            "data_de_registro",
            "valor_de_compra_praticado",
            "valor_de_venda_praticado",
            "categoria_da_peca",
            "descricao_da_peca",
        ]
        read_only_fields = [
            "data_de_registro",
            "valor_de_compra_praticado",
            "valor_de_venda_praticado",
            "categoria_da_peca",
            "descricao_da_peca",
        ]
