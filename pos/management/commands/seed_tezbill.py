from django.core.management.base import BaseCommand
from pos.services import ensure_seeded


class Command(BaseCommand):
    help = "Seed Tezbill database with Pakistani retail catalog, stores, tax codes, and initial documents"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Clear existing records before seeding initial data",
        )

    def handle(self, *args, **options):
        reset = bool(options.get("reset"))
        seeded = ensure_seeded(force_reset=reset)
        if seeded:
            self.stdout.write(self.style.SUCCESS("Tezbill database seeded with initial retail store data."))
        else:
            self.stdout.write("Database already contains data. Use --reset to re-initialize.")
