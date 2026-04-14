import random
from datetime import datetime, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from core.models import Cliente, Produto, Venda


FIRST_NAMES = [
    "Ana", "Maria", "Beatriz", "Fernanda", "Camila", "Juliana", "Patricia", "Aline", "Renata", "Daniela",
    "Clara", "Paula", "Carla", "Joana", "Amanda", "Bruna", "Isabela", "Mariana", "Sofia", "Leticia",
]

LAST_NAMES = [
    "Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Costa", "Gomes", "Ribeiro", "Almeida",
    "Martins", "Rocha", "Melo", "Araujo", "Fernandes", "Barbosa", "Cardoso", "Correia", "Teixeira", "Moura",
]

PRODUCT_WORDS = [
    "Delicada", "Classica", "Elegante", "Brilho", "Perola", "Cristal", "Luxo", "Dourada", "Prata", "Rubi",
    "Esmeralda", "Safira", "Charm", "Aura", "Luar", "Encanto", "Flor", "Estrela", "Premium", "Bella",
]

CATEGORIES = ["anel", "brinco", "colar", "pulseira", "outros"]


def money(value):
    return Decimal(value).quantize(Decimal("0.01"))


def random_phone():
    ddd = random.randint(11, 99)
    prefix = random.randint(90000, 99999)
    suffix = random.randint(1000, 9999)
    return f"({ddd}) {prefix}-{suffix}"


def random_birthdate():
    start = datetime(1965, 1, 1).date()
    end = datetime(2005, 12, 31).date()
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, delta))


def random_datetime_last_days(days):
    now = timezone.now()
    start = now - timedelta(days=days)
    seconds = int((now - start).total_seconds())
    return start + timedelta(seconds=random.randint(0, max(seconds, 1)))


class Command(BaseCommand):
    help = "Gera massa de dados para clientes, produtos e vendas."

    def add_arguments(self, parser):
        parser.add_argument("--clientes", type=int, default=200, help="Quantidade de clientes a criar.")
        parser.add_argument("--produtos", type=int, default=300, help="Quantidade de produtos a criar.")
        parser.add_argument("--vendas", type=int, default=1200, help="Quantidade de vendas a criar.")
        parser.add_argument("--seed", type=int, default=42, help="Seed para reproducao.")
        parser.add_argument("--dias", type=int, default=365, help="Distribuir datas nos ultimos N dias.")
        parser.add_argument("--reset", action="store_true", help="Apaga dados atuais antes de criar.")

    @transaction.atomic
    def handle(self, *args, **options):
        random.seed(options["seed"])

        n_clientes = max(0, options["clientes"])
        n_produtos = max(0, options["produtos"])
        n_vendas = max(0, options["vendas"])
        dias = max(1, options["dias"])

        if options["reset"]:
            self.stdout.write("Limpando dados atuais...")
            Venda.objects.all().delete()
            Produto.objects.all().delete()
            Cliente.objects.all().delete()

        self.stdout.write("Criando clientes...")
        clientes = []
        for i in range(n_clientes):
            first = random.choice(FIRST_NAMES)
            last = random.choice(LAST_NAMES)
            nome = f"{first} {last}"
            email = f"{first.lower()}.{last.lower()}.{i}@mail.com"
            clientes.append(
                Cliente(
                    nome=nome,
                    telefone=random_phone(),
                    email=email,
                    data_de_aniversario=random_birthdate(),
                )
            )
        Cliente.objects.bulk_create(clientes, batch_size=500)
        clientes = list(Cliente.objects.all())

        self.stdout.write("Criando produtos...")
        produtos = []
        for i in range(n_produtos):
            categoria = random.choice(CATEGORIES)
            nome_a = random.choice(PRODUCT_WORDS)
            nome_b = random.choice(PRODUCT_WORDS)
            descricao = f"{categoria.capitalize()} {nome_a} {nome_b} {i + 1}"

            base = Decimal(random.randint(1200, 8500)) / Decimal(100)
            margem = Decimal(random.randint(25, 120)) / Decimal(100)
            valor_compra = money(base)
            valor_venda = money(base * margem)

            produtos.append(
                Produto(
                    categoria_da_peca=categoria,
                    descricao_da_peca=descricao,
                    quantidade=random.randint(20, 120),
                    valor_de_compra=valor_compra,
                    valor_de_venda=valor_venda,
                )
            )
        Produto.objects.bulk_create(produtos, batch_size=500)
        produtos = list(Produto.objects.all())

        if not clientes or not produtos or n_vendas == 0:
            self.stdout.write(self.style.WARNING("Sem base suficiente para criar vendas."))
            self._print_summary()
            return

        self.stdout.write("Criando vendas...")
        vendas_criadas = 0
        sem_estoque = 0

        produtos_em_estoque = [p for p in produtos if p.quantidade > 0]

        while vendas_criadas < n_vendas and produtos_em_estoque:
            produto = random.choice(produtos_em_estoque)
            cliente = random.choice(clientes)

            qtd = random.randint(1, min(4, produto.quantidade))
            variacao = Decimal(random.randint(90, 115)) / Decimal(100)
            preco_praticado = money(produto.valor_de_venda * variacao)

            venda = Venda.objects.create(
                produto=produto,
                cliente=cliente,
                quantidade=qtd,
                valor_de_venda_praticado=preco_praticado,
            )

            Venda.objects.filter(pk=venda.pk).update(
                data_de_registro=random_datetime_last_days(dias)
            )

            produto.refresh_from_db(fields=["quantidade"])
            vendas_criadas += 1

            if produto.quantidade <= 0:
                sem_estoque += 1
                produtos_em_estoque = [p for p in produtos_em_estoque if p.id != produto.id]

        if vendas_criadas < n_vendas:
            self.stdout.write(
                self.style.WARNING(
                    f"Vendas solicitadas: {n_vendas}, criadas: {vendas_criadas}. "
                    "Estoque disponivel acabou antes do previsto."
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seed concluido: {len(clientes)} clientes, {len(produtos)} produtos, {vendas_criadas} vendas."
            )
        )
        self.stdout.write(f"Produtos que zeraram estoque durante seed: {sem_estoque}")
        self._print_summary()

    def _print_summary(self):
        clientes_total = Cliente.objects.count()
        produtos_total = Produto.objects.count()
        vendas_total = Venda.objects.count()
        itens_estoque = sum(p.quantidade for p in Produto.objects.only("quantidade"))

        self.stdout.write(
            f"Resumo atual -> clientes: {clientes_total}, produtos: {produtos_total}, "
            f"vendas: {vendas_total}, itens em estoque: {itens_estoque}"
        )
