from django.db import models, transaction
from django.core.exceptions import ValidationError


class Produto(models.Model):
    CATEGORIAS = [
        ("anel", "Anel"),
        ("brinco", "Brinco"),
        ("colar", "Colar"),
        ("pulseira", "Pulseira"),
        ("outros", "Outros"),
    ]
    categoria_da_peca = models.CharField(max_length=50, choices=CATEGORIAS)
    descricao_da_peca = models.CharField(max_length=255)
    quantidade = models.PositiveIntegerField(default=0)
    foto_da_peca = models.ImageField(upload_to="produtos/", blank=True, null=True)
    data_de_registro_da_peca = models.DateTimeField(auto_now_add=True)
    valor_de_compra = models.DecimalField(max_digits=10, decimal_places=2)
    valor_de_venda = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.descricao_da_peca} ({self.categoria_da_peca})"


class Cliente(models.Model):
    nome = models.CharField(max_length=120)
    telefone = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    data_de_aniversario = models.DateField(blank=True, null=True)

    def __str__(self):
        return self.nome


class Venda(models.Model):
    produto = models.ForeignKey(Produto, on_delete=models.PROTECT, related_name="vendas")
    quantidade = models.PositiveIntegerField()
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name="vendas")
    data_de_registro = models.DateTimeField(auto_now_add=True)
    valor_de_compra_praticado = models.DecimalField(max_digits=10, decimal_places=2)
    valor_de_venda_praticado = models.DecimalField(max_digits=10, decimal_places=2)
    categoria_da_peca = models.CharField(max_length=50)
    descricao_da_peca = models.CharField(max_length=255)

    def clean(self):
        if self.quantidade <= 0:
            raise ValidationError("Quantidade da venda deve ser positiva.")

    def save(self, *args, **kwargs):
        with transaction.atomic():
            creating = self._state.adding

            old_prod = None
            old_qty = None
            if not creating:
                orig = type(self).objects.select_related("produto").get(pk=self.pk)
                old_prod = orig.produto
                old_qty = orig.quantidade

            if creating:
                if self.valor_de_compra_praticado is None:
                    self.valor_de_compra_praticado = self.produto.valor_de_compra
                if self.valor_de_venda_praticado is None:
                    self.valor_de_venda_praticado = self.produto.valor_de_venda
                if not self.categoria_da_peca:
                    self.categoria_da_peca = self.produto.categoria_da_peca
                if not self.descricao_da_peca:
                    self.descricao_da_peca = self.produto.descricao_da_peca
            else:
                if self.produto_id != old_prod.id:
                    if not self.categoria_da_peca:
                        self.categoria_da_peca = self.produto.categoria_da_peca
                    if not self.descricao_da_peca:
                        self.descricao_da_peca = self.produto.descricao_da_peca
                    if self.valor_de_compra_praticado is None:
                        self.valor_de_compra_praticado = self.produto.valor_de_compra
                    if self.valor_de_venda_praticado is None:
                        self.valor_de_venda_praticado = self.produto.valor_de_venda
                else:
                    if self.valor_de_compra_praticado is None:
                        self.valor_de_compra_praticado = self.produto.valor_de_compra
                    if self.valor_de_venda_praticado is None:
                        self.valor_de_venda_praticado = self.produto.valor_de_venda

            self.full_clean()

            if creating:
                if self.quantidade > self.produto.quantidade:
                    raise ValidationError("Quantidade da venda excede o estoque disponível.")
                super().save(*args, **kwargs)
                self.produto.quantidade = models.F("quantidade") - self.quantidade
                self.produto.save(update_fields=["quantidade"])
                self.produto.refresh_from_db()
            else:
                if self.produto_id == old_prod.id:
                    delta = self.quantidade - old_qty
                    if delta > 0 and delta > self.produto.quantidade:
                        raise ValidationError("Estoque insuficiente para aumentar a quantidade da venda.")
                    super().save(*args, **kwargs)
                    self.produto.quantidade = models.F("quantidade") - delta
                    self.produto.save(update_fields=["quantidade"])
                    self.produto.refresh_from_db()
                else:
                    if self.quantidade > self.produto.quantidade:
                        raise ValidationError("Estoque insuficiente no novo produto.")
                    super().save(*args, **kwargs)
                    old_prod.quantidade = models.F("quantidade") + old_qty
                    old_prod.save(update_fields=["quantidade"])
                    self.produto.quantidade = models.F("quantidade") - self.quantidade
                    self.produto.save(update_fields=["quantidade"])
                    old_prod.refresh_from_db()
                    self.produto.refresh_from_db()
