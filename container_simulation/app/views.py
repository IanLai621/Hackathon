from django.shortcuts import render
import json


def index(request):
    return render(request, 'dist/index.html')


def container(request):
    print(request.POST)
    container_info = json.loads(request.POST.get('data'))
    print(container_info)
    return json.dumps({
        'id': 'xyz-0123465',
        'type_name': 'A',
        'x': 1615,
        'y': 244,
        'z': 262,
        'weight_limit': 20,
        'numbers': 1,
        'list': {
            'a': {
                'type_name': 'a_box',
                'pos': {
                    'x': 5,
                    'y': 0,
                    'z': 3,
                },
                'w': 40,
                'h': 20,
                'd': 30,
                'content': 'this is a cargo',
                'weight': 25,
                'priority': 2,
                'numbers': 1,
            }
        }
    })
