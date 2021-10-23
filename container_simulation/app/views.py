from django.shortcuts import render
from json import loads


def index(request):
    return render(request, 'dist/index.html')


def container(request):
    container_info = loads(request.GET['data'])
    print(container_info)
