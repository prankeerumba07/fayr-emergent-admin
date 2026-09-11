import os
import zipfile

ROOT = "/app"
OUT_ZIP = "/app/fayr-admin-source.zip"
OUT_TXT = "/app/fayr-admin-source.txt"

INCLUDE_FILES = [
    "backend/server.py",
    "backend/requirements.txt",
    "backend/.env.example",
    "frontend/package.json",
    "frontend/tailwind.config.js",
    "frontend/postcss.config.js",
    "frontend/craco.config.js",
    "frontend/jsconfig.json",
    "frontend/.env.example",
    "design_guidelines.json",
    "memory/PRD.md",
    "README.md",
]
INCLUDE_DIRS = [
    "frontend/src",
    "frontend/public",
    "backend/tests",
]
EXCLUDE_PARTS = {"node_modules", "__pycache__", ".git", "build", "dist", ".cache", "venv", ".pytest_cache"}
EXCLUDE_EXT = {".pyc", ".map", ".lock"}
# Never bundle real secrets/credentials, even if referenced elsewhere.
EXCLUDE_NAMES = {".env", "test_credentials.md", "auth_testing.md"}


def wanted(rel):
    parts = set(rel.split(os.sep))
    if parts & EXCLUDE_PARTS:
        return False
    if os.path.basename(rel) in EXCLUDE_NAMES:
        return False
    if os.path.splitext(rel)[1] in EXCLUDE_EXT:
        return False
    return True


def collect():
    files = []
    for f in INCLUDE_FILES:
        p = os.path.join(ROOT, f)
        if os.path.isfile(p):
            files.append(f)
    for d in INCLUDE_DIRS:
        base = os.path.join(ROOT, d)
        for cur, dirs, fnames in os.walk(base):
            dirs[:] = [x for x in dirs if x not in EXCLUDE_PARTS]
            for fn in fnames:
                rel = os.path.relpath(os.path.join(cur, fn), ROOT)
                if wanted(rel):
                    files.append(rel)
    return sorted(set(files))


def main():
    files = collect()
    with zipfile.ZipFile(OUT_ZIP, "w", zipfile.ZIP_DEFLATED) as z:
        for rel in files:
            z.write(os.path.join(ROOT, rel), arcname=os.path.join("fayr-admin", rel))

    with open(OUT_TXT, "w", encoding="utf-8") as out:
        out.write("FAYR ADMIN PANEL - FULL SOURCE BUNDLE\n")
        out.write("=" * 70 + "\n\n")
        out.write("TABLE OF CONTENTS (%d files)\n" % len(files))
        out.write("-" * 70 + "\n")
        for rel in files:
            out.write("  " + rel + "\n")
        out.write("\n\n")
        for rel in files:
            out.write("\n" + "=" * 70 + "\n")
            out.write("FILE: " + rel + "\n")
            out.write("=" * 70 + "\n\n")
            try:
                with open(os.path.join(ROOT, rel), "r", encoding="utf-8") as fh:
                    out.write(fh.read())
            except Exception as e:
                out.write("<<unreadable: %s>>" % e)
            out.write("\n")

    print("files bundled:", len(files))
    for rel in files:
        print("  ", rel)


if __name__ == "__main__":
    main()
