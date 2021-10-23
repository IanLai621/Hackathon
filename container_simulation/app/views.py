from django.http import HttpResponse
from json import loads


def index(request):
    return HttpResponse("Hello Nuts!")


def container(request):
    container_info = loads(request.GET['data'])
    print(container_info)
