from ws.base_redis import redis_client_storage
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    args = ''
    help = 'Flush the redis database'

    def handle(self, *args, **options):    
        redis_client_storage.flushdb()
        redis_client_storage.connection_pool.disconnect()