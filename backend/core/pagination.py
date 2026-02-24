from rest_framework.response import Response

def paginate_queryset(queryset, request):
    """
    Simple pagination for MongoEngine querysets.
    """
    page = int(request.query_params.get('page', 1))
    page_size = int(request.query_params.get('page_size', 20))
    
    start = (page - 1) * page_size
    end = start + page_size
    
    total = queryset.count()
    items = queryset[start:end]
    
    return {
        'items': items,
        'total': total,
        'page': page,
        'page_size': page_size,
        'total_pages': (total + page_size - 1) // page_size
    }
