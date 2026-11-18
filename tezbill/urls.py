from pathlib import Path
from django.conf import settings
from django.contrib import admin
from django.http import FileResponse, HttpResponse
from django.urls import include, path, re_path

admin.site.site_header = "Tezbill POS Administration"
admin.site.site_title = "Tezbill POS Admin"
admin.site.index_title = "Retail Operations & Prism Schema Tables"


def serve_spa(request):
    index_file = Path(settings.BASE_DIR) / "dist" / "index.html"
    if index_file.exists():
        return FileResponse(open(index_file, "rb"), content_type="text/html")
    return HttpResponse(
        "Tezbill POS Django API is running. Run 'npm run build' or 'npm run dev' to launch the POS web interface.",
        content_type="text/plain",
    )


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("pos.urls")),
    re_path(r"^(?!api/|admin/|assets/).*$", serve_spa),
]
