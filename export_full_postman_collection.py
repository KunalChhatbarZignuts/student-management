import json
import uuid
import re
from app.main import app

def resolve_ref(ref_str, openapi_spec):
    if not ref_str or not ref_str.startswith("#/"):
        return {}
    parts = ref_str.lstrip("#/").split("/")
    curr = openapi_spec
    for p in parts:
        curr = curr.get(p, {})
    return curr

def generate_sample_from_schema(schema, openapi_spec, depth=0):
    if depth > 4:
        return {}
    if "$ref" in schema:
        resolved = resolve_ref(schema["$ref"], openapi_spec)
        return generate_sample_from_schema(resolved, openapi_spec, depth + 1)
    
    stype = schema.get("type", "object")
    if stype == "string":
        if "example" in schema:
            return schema["example"]
        if schema.get("format") == "date":
            return "2026-11-17"
        if schema.get("format") == "date-time":
            return "2026-11-17T10:00:00Z"
        if schema.get("format") == "uuid":
            return "439233b6-1453-4a01-be2a-bb1cc54c6bea"
        return schema.get("default", "string")
    elif stype in ("integer", "number"):
        return schema.get("example", schema.get("default", 0))
    elif stype == "boolean":
        return schema.get("example", schema.get("default", True))
    elif stype == "array":
        items_schema = schema.get("items", {})
        sample_item = generate_sample_from_schema(items_schema, openapi_spec, depth + 1)
        return [sample_item] if sample_item is not None else []
    elif stype == "object" or "properties" in schema:
        obj = {}
        props = schema.get("properties", {})
        for prop_name, prop_schema in props.items():
            obj[prop_name] = generate_sample_from_schema(prop_schema, openapi_spec, depth + 1)
        return obj
    return {}

def build_full_collection():
    openapi_spec = app.openapi()
    paths = openapi_spec.get("paths", {})
    
    # Categorize by tag
    folders = {}
    
    login_test_script = [
        "if (pm.response.code === 200) {",
        "    var jsonData = pm.response.json();",
        "    if (jsonData.access_token) {",
        "        pm.environment.set('access_token', jsonData.access_token);",
        "        console.log('Access token updated in environment!');",
        "    }",
        "}"
    ]

    for path_str, path_item in paths.items():
        for method_str, op in path_item.items():
            if method_str.lower() not in ("get", "post", "put", "delete", "patch"):
                continue
            
            method = method_str.upper()
            summary = op.get("summary") or op.get("operationId") or f"{method} {path_str}"
            desc = op.get("description", "")
            tags = op.get("tags", ["General / Other"])
            tag = tags[0] if tags else "General / Other"
            
            if tag not in folders:
                folders[tag] = []
            
            # Convert {param} to :param for Postman
            postman_path = re.sub(r'\{([^}]+)\}', r':\1', path_str)
            path_segments = [p for p in postman_path.strip("/").split("/") if p]
            
            # URL variables
            url_vars = []
            path_params = re.findall(r'\{([^}]+)\}', path_str)
            for p in path_params:
                url_vars.append({
                    "key": p,
                    "value": f"{{{{{p}}}}}" if p in ("student_id", "teacher_id", "grade_id", "section_id", "academic_year_id") else "sample_id",
                    "description": f"URL Path parameter: {p}"
                })
            
            # Query parameters
            query_items = []
            for param in op.get("parameters", []):
                if param.get("in") == "query":
                    p_name = param.get("name")
                    p_schema = param.get("schema", {})
                    p_default = p_schema.get("default", "")
                    p_required = param.get("required", False)
                    query_items.append({
                        "key": p_name,
                        "value": str(p_default) if p_default is not None else "",
                        "description": param.get("description", ""),
                        "disabled": not p_required
                    })
            
            # Headers
            headers = []
            req_body = None
            if "requestBody" in op:
                content = op["requestBody"].get("content", {})
                if "application/json" in content:
                    headers.append({"key": "Content-Type", "value": "application/json"})
                    body_schema = content["application/json"].get("schema", {})
                    sample_payload = generate_sample_from_schema(body_schema, openapi_spec)
                    req_body = {
                        "mode": "raw",
                        "raw": json.dumps(sample_payload, indent=2)
                    }
                elif "application/x-www-form-urlencoded" in content:
                    headers.append({"key": "Content-Type", "value": "application/x-www-form-urlencoded"})
                    req_body = {
                        "mode": "urlencoded",
                        "urlencoded": []
                    }
            
            # Specific Portal header if path belongs to admin/teacher/parent
            if "/admin" in path_str:
                headers.append({"key": "X-Client-Portal", "value": "admin"})
            elif "/teacher" in path_str:
                headers.append({"key": "X-Client-Portal", "value": "admin"})
            elif "/parents" in path_str or "/parent" in path_str:
                headers.append({"key": "X-Client-Portal", "value": "parent"})
            elif "/students" in path_str or "/student" in path_str:
                headers.append({"key": "X-Client-Portal", "value": "student"})

            request_obj = {
                "method": method,
                "header": headers,
                "url": {
                    "raw": f"{{{{base_url}}}}{postman_path}" + (("?" + "&".join(f"{q['key']}={q['value']}" for q in query_items if not q.get('disabled'))) if query_items else ""),
                    "host": ["{{base_url}}"],
                    "path": path_segments,
                    "query": query_items if query_items else None,
                    "variable": url_vars if url_vars else None
                },
                "description": desc
            }
            if req_body:
                request_obj["body"] = req_body

            item = {
                "name": summary,
                "request": request_obj
            }

            # If login endpoint, add script
            if path_str.endswith("/auth/login") and method == "POST":
                item["event"] = [
                    {
                        "listen": "test",
                        "script": {
                            "type": "text/javascript",
                            "exec": login_test_script
                        }
                    }
                ]
                request_obj["auth"] = { "type": "noauth" }

            folders[tag].append(item)

    # Build collection items
    collection_items = []
    for tag_name, items in sorted(folders.items()):
        collection_items.append({
            "name": tag_name,
            "description": f"All API operations under tag: {tag_name}",
            "item": items
        })

    full_collection = {
        "info": {
            "_postman_id": str(uuid.uuid4()),
            "name": "School & Student Management System - Complete API (All 227 Endpoints)",
            "description": f"Exhaustive collection generated directly from FastAPI OpenAPI schema containing all {len(paths)} routes and endpoints across all modules.",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "auth": {
            "type": "bearer",
            "bearer": [
                {
                    "key": "token",
                    "value": "{{access_token}}",
                    "type": "string"
                }
            ]
        },
        "item": collection_items
    }

    with open("School_Management_Full_All_227_APIs.postman_collection.json", "w") as f:
        json.dump(full_collection, f, indent=2)

    # Also ensure School_Management_Core_Demo.postman_collection.json is created
    with open("School_Management_System.postman_collection.json", "r") as src:
        core_data = json.load(src)
        core_data["info"]["name"] = "School & Student Management System - Core Demo (35 Key APIs)"
        with open("School_Management_Core_Demo.postman_collection.json", "w") as dst:
            json.dump(core_data, dst, indent=2)

    total_endpoints = sum(len(f["item"]) for f in collection_items)
    print(f"Generated Full Collection with {len(collection_items)} folders and {total_endpoints} total endpoints!")

if __name__ == "__main__":
    build_full_collection()
