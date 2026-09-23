from django.db import models


class Produto(models.Model):

    nome = models.CharField(
        max_length=200
    )

    referencia = models.CharField(
        max_length=50,
        unique=True
    )

    categoria = models.CharField(
        max_length=100
    )

    descricao = models.TextField(
        blank=True
    )

    imagem_principal = models.ImageField(
        upload_to="produtos/",
        blank=True,
        null=True
    )

    criado_em = models.DateTimeField(
        auto_now_add=True
    )


    def __str__(self):
        return self.nome