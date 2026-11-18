import json
import uuid

def generate_postman_artifacts():
    collection_id = str(uuid.uuid4())
    
    # Postman test script to automatically extract and save JWT token
    login_test_script = [
        "if (pm.response.code === 200) {",
        "    var jsonData = pm.response.json();",
        "    if (jsonData.access_token) {",
        "        pm.environment.set('access_token', jsonData.access_token);",
        "        console.log('Access token successfully updated in environment!');",
        "    }",
        "}"
    ]

    collection = {
        "info": {
            "_postman_id": collection_id,
            "name": "School & Student Management System API",
            "description": "Comprehensive Postman collection for School & Student Management System ERP covering Authentication, Admissions, Student Directory, Faculty, Academic Structure, Attendance, Razorpay Fee Payments, Examinations, and Audit Logs.",
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
        "item": [
            # -------------------------------------------------------------
            # FOLDER 1: Authentication & Users
            # -------------------------------------------------------------
            {
                "name": "1. Authentication & User Access",
                "item": [
                    {
                        "name": "Admin Login (Auto-saves Token)",
                        "event": [
                            {
                                "listen": "test",
                                "script": {
                                    "type": "text/javascript",
                                    "exec": login_test_script
                                }
                            }
                        ],
                        "request": {
                            "auth": { "type": "noauth" },
                            "method": "POST",
                            "header": [
                                { "key": "Content-Type", "value": "application/json" },
                                { "key": "X-Client-Portal", "value": "admin" }
                            ],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps({
                                    "email": "{{admin_email}}",
                                    "password": "{{admin_password}}"
                                }, indent=2)
                            },
                            "url": {
                                "raw": "{{base_url}}/api/v1/auth/login",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "auth", "login"]
                            },
                            "description": "Authenticates as Administrator and automatically saves access_token into the active environment."
                        }
                    },
                    {
                        "name": "Teacher Login",
                        "event": [
                            {
                                "listen": "test",
                                "script": {
                                    "type": "text/javascript",
                                    "exec": login_test_script
                                }
                            }
                        ],
                        "request": {
                            "auth": { "type": "noauth" },
                            "method": "POST",
                            "header": [
                                { "key": "Content-Type", "value": "application/json" },
                                { "key": "X-Client-Portal", "value": "admin" }
                            ],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps({
                                    "email": "{{teacher_email}}",
                                    "password": "{{teacher_password}}"
                                }, indent=2)
                            },
                            "url": {
                                "raw": "{{base_url}}/api/v1/auth/login",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "auth", "login"]
                            }
                        }
                    },
                    {
                        "name": "Parent Login",
                        "event": [
                            {
                                "listen": "test",
                                "script": {
                                    "type": "text/javascript",
                                    "exec": login_test_script
                                }
                            }
                        ],
                        "request": {
                            "auth": { "type": "noauth" },
                            "method": "POST",
                            "header": [
                                { "key": "Content-Type", "value": "application/json" },
                                { "key": "X-Client-Portal", "value": "parent" }
                            ],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps({
                                    "email": "{{parent_email}}",
                                    "password": "{{parent_password}}"
                                }, indent=2)
                            },
                            "url": {
                                "raw": "{{base_url}}/api/v1/auth/login",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "auth", "login"]
                            }
                        }
                    },
                    {
                        "name": "Get Current User Profile (/me)",
                        "request": {
                            "method": "GET",
                            "header": [],
                            "url": {
                                "raw": "{{base_url}}/api/v1/auth/me",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "auth", "me"]
                            }
                        }
                    },
                    {
                        "name": "Refresh Token",
                        "request": {
                            "method": "POST",
                            "header": [],
                            "url": {
                                "raw": "{{base_url}}/api/v1/auth/refresh",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "auth", "refresh"]
                            }
                        }
                    },
                    {
                        "name": "Change Password",
                        "request": {
                            "method": "POST",
                            "header": [{ "key": "Content-Type", "value": "application/json" }],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps({
                                    "current_password": "{{admin_password}}",
                                    "new_password": "NewSecurePassword@123"
                                }, indent=2)
                            },
                            "url": {
                                "raw": "{{base_url}}/api/v1/auth/change-password",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "auth", "change-password"]
                            }
                        }
                    },
                    {
                        "name": "Logout",
                        "request": {
                            "method": "POST",
                            "header": [],
                            "url": {
                                "raw": "{{base_url}}/api/v1/auth/logout",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "auth", "logout"]
                            }
                        }
                    }
                ]
            },

            # -------------------------------------------------------------
            # FOLDER 2: Admissions & Student Management
            # -------------------------------------------------------------
            {
                "name": "2. Admissions & Student Management",
                "item": [
                    {
                        "name": "List All Students (with Search & Pagination)",
                        "request": {
                            "method": "GET",
                            "header": [],
                            "url": {
                                "raw": "{{base_url}}/api/v1/admin/students?page=1&size=20&search=",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "admin", "students"],
                                "query": [
                                    { "key": "page", "value": "1" },
                                    { "key": "size", "value": "20" },
                                    { "key": "search", "value": "" },
                                    { "key": "grade_id", "value": "{{grade_id}}", "disabled": True },
                                    { "key": "section_id", "value": "{{section_id}}", "disabled": True },
                                    { "key": "status", "value": "active", "disabled": True }
                                ]
                            }
                        }
                    },
                    {
                        "name": "Get Student Comprehensive Details",
                        "request": {
                            "method": "GET",
                            "header": [],
                            "url": {
                                "raw": "{{base_url}}/api/v1/admin/students/{{student_id}}/details",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "admin", "students", "{{student_id}}", "details"]
                            }
                        }
                    },
                    {
                        "name": "Create Student Admission",
                        "request": {
                            "method": "POST",
                            "header": [{ "key": "Content-Type", "value": "application/json" }],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps({
                                    "first_name": "Aarav",
                                    "last_name": "Patel",
                                    "date_of_birth": "2015-08-15",
                                    "gender": "male",
                                    "grade_id": "{{grade_id}}",
                                    "section_id": "{{section_id}}",
                                    "academic_year_id": "{{academic_year_id}}",
                                    "emergency_contact": "+91 9876543210",
                                    "parent": {
                                        "first_name": "Rajesh",
                                        "last_name": "Patel",
                                        "email": "rajesh.patel@example.com",
                                        "phone": "+91 9876543210",
                                        "relationship": "FATHER"
                                    }
                                }, indent=2)
                            },
                            "url": {
                                "raw": "{{base_url}}/api/v1/admin/admissions",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "admin", "admissions"]
                            }
                        }
                    },
                    {
                        "name": "Update Student Details",
                        "request": {
                            "method": "PUT",
                            "header": [{ "key": "Content-Type", "value": "application/json" }],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps({
                                    "first_name": "Aarav",
                                    "last_name": "Patel",
                                    "gender": "male",
                                    "status": "active"
                                }, indent=2)
                            },
                            "url": {
                                "raw": "{{base_url}}/api/v1/admin/students/{{student_id}}",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "admin", "students", "{{student_id}}"]
                            }
                        }
                    },
                    {
                        "name": "Delete Student (with Portal Sync)",
                        "request": {
                            "method": "DELETE",
                            "header": [],
                            "url": {
                                "raw": "{{base_url}}/api/v1/admin/students/{{student_id}}",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "admin", "students", "{{student_id}}"]
                            },
                            "description": "Deletes the student, cascades enrollment records, cleans linked parent relations, and revokes portal access."
                        }
                    }
                ]
            },

            # -------------------------------------------------------------
            # FOLDER 3: Teachers & Faculty Management
            # -------------------------------------------------------------
            {
                "name": "3. Teachers & Faculty Management",
                "item": [
                    {
                        "name": "List All Teachers",
                        "request": {
                            "method": "GET",
                            "header": [],
                            "url": {
                                "raw": "{{base_url}}/api/v1/admin/teachers?limit=50&offset=0",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "admin", "teachers"],
                                "query": [
                                    { "key": "limit", "value": "50" },
                                    { "key": "offset", "value": "0" },
                                    { "key": "department", "value": "CS", "disabled": True }
                                ]
                            }
                        }
                    },
                    {
                        "name": "Create Faculty Member",
                        "request": {
                            "method": "POST",
                            "header": [{ "key": "Content-Type", "value": "application/json" }],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps({
                                    "first_name": "Vikram",
                                    "last_name": "Sarabhai",
                                    "email": "vikram.sarabhai@school.com",
                                    "phone": "+91 9988776655",
                                    "department": "Science",
                                    "employee_code": "EMP-2026-042"
                                }, indent=2)
                            },
                            "url": {
                                "raw": "{{base_url}}/api/v1/admin/teachers",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "admin", "teachers"]
                            }
                        }
                    },
                    {
                        "name": "Get Teacher Details (/details)",
                        "request": {
                            "method": "GET",
                            "header": [],
                            "url": {
                                "raw": "{{base_url}}/api/v1/admin/teachers/{{teacher_id}}/details",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "admin", "teachers", "{{teacher_id}}", "details"]
                            }
                        }
                    },
                    {
                        "name": "Teacher Portal: My Classes",
                        "request": {
                            "method": "GET",
                            "header": [{ "key": "X-Client-Portal", "value": "admin" }],
                            "url": {
                                "raw": "{{base_url}}/api/v1/teacher/my-classes",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "teacher", "my-classes"]
                            }
                        }
                    },
                    {
                        "name": "List Curriculum Subjects",
                        "request": {
                            "method": "GET",
                            "header": [],
                            "url": {
                                "raw": "{{base_url}}/api/v1/admin/subjects?page=1&size=100",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "admin", "subjects"],
                                "query": [
                                    { "key": "page", "value": "1" },
                                    { "key": "size", "value": "100" }
                                ]
                            }
                        }
                    },
                    {
                        "name": "Create Subject",
                        "request": {
                            "method": "POST",
                            "header": [{ "key": "Content-Type", "value": "application/json" }],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps({
                                    "name": "Artificial Intelligence",
                                    "code": "AI-101",
                                    "department": "Computer Science"
                                }, indent=2)
                            },
                            "url": {
                                "raw": "{{base_url}}/api/v1/admin/subjects",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "admin", "subjects"]
                            }
                        }
                    },
                    {
                        "name": "Subject Assignment Matrix (List)",
                        "request": {
                            "method": "GET",
                            "header": [],
                            "url": {
                                "raw": "{{base_url}}/api/v1/admin/teacher-subjects",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "admin", "teacher-subjects"]
                            }
                        }
                    },
                    {
                        "name": "Assign Subject to Teacher",
                        "request": {
                            "method": "POST",
                            "header": [{ "key": "Content-Type", "value": "application/json" }],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps({
                                    "teacher_id": "{{teacher_id}}",
                                    "grade_id": "{{grade_id}}",
                                    "section_id": "{{section_id}}",
                                    "academic_year_id": "{{academic_year_id}}",
                                    "assignments": [
                                        { "subject_id": "c798b3be-af8b-4cd2-8c1a-49208b7bcfee" }
                                    ]
                                }, indent=2)
                            },
                            "url": {
                                "raw": "{{base_url}}/api/v1/admin/teacher-subjects",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "admin", "teacher-subjects"]
                            }
                        }
                    }
                ]
            },

            # -------------------------------------------------------------
            # FOLDER 4: Academic Structure (Grades & Sections)
            # -------------------------------------------------------------
            {
                "name": "4. Academic Structure (Grades & Sections)",
                "item": [
                    {
                        "name": "List Academic Years",
                        "request": {
                            "method": "GET",
                            "header": [],
                            "url": {
                                "raw": "{{base_url}}/api/v1/admin/academic-years",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "admin", "academic-years"]
                            }
                        }
                    },
                    {
                        "name": "Create Academic Year",
                        "request": {
                            "method": "POST",
                            "header": [{ "key": "Content-Type", "value": "application/json" }],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps({
                                    "name": "2027-2028",
                                    "start_date": "2027-06-01",
                                    "end_date": "2028-04-30",
                                    "is_current": False
                                }, indent=2)
                            },
                            "url": {
                                "raw": "{{base_url}}/api/v1/admin/academic-years",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "admin", "academic-years"]
                            }
                        }
                    },
                    {
                        "name": "List Grades",
                        "request": {
                            "method": "GET",
                            "header": [],
                            "url": {
                                "raw": "{{base_url}}/api/v1/admin/grades?size=50",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "admin", "grades"],
                                "query": [{ "key": "size", "value": "50" }]
                            }
                        }
                    },
                    {
                        "name": "Create Grade",
                        "request": {
                            "method": "POST",
                            "header": [{ "key": "Content-Type", "value": "application/json" }],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps({
                                    "name": "Grade 11",
                                    "level": 11,
                                    "academic_year_id": "{{academic_year_id}}"
                                }, indent=2)
                            },
                            "url": {
                                "raw": "{{base_url}}/api/v1/admin/grades",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "admin", "grades"]
                            }
                        }
                    },
                    {
                        "name": "List Sections",
                        "request": {
                            "method": "GET",
                            "header": [],
                            "url": {
                                "raw": "{{base_url}}/api/v1/admin/sections",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "admin", "sections"]
                            }
                        }
                    },
                    {
                        "name": "Create Section",
                        "request": {
                            "method": "POST",
                            "header": [{ "key": "Content-Type", "value": "application/json" }],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps({
                                    "name": "11-A",
                                    "grade_id": "{{grade_id}}",
                                    "class_capacity": 40
                                }, indent=2)
                            },
                            "url": {
                                "raw": "{{base_url}}/api/v1/admin/sections",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "admin", "sections"]
                            }
                        }
                    },
                    {
                        "name": "Assign Homeroom Class Teacher",
                        "request": {
                            "method": "POST",
                            "header": [{ "key": "Content-Type", "value": "application/json" }],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps({
                                    "teacher_id": "{{teacher_id}}",
                                    "academic_year_id": "{{academic_year_id}}"
                                }, indent=2)
                            },
                            "url": {
                                "raw": "{{base_url}}/api/v1/admin/sections/{{section_id}}/teacher",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "admin", "sections", "{{section_id}}", "teacher"]
                            }
                        }
                    }
                ]
            },

            # -------------------------------------------------------------
            # FOLDER 5: Class Attendance & Calendar
            # -------------------------------------------------------------
            {
                "name": "5. Class Attendance & Calendar",
                "item": [
                    {
                        "name": "Get Section Attendance Roster (for Roll-Call)",
                        "request": {
                            "method": "GET",
                            "header": [{ "key": "X-Client-Portal", "value": "admin" }],
                            "url": {
                                "raw": "{{base_url}}/api/v1/teacher/attendance/sections/{{section_id}}/roster?date=2026-11-17",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "teacher", "attendance", "sections", "{{section_id}}", "roster"],
                                "query": [{ "key": "date", "value": "2026-11-17" }]
                            }
                        }
                    },
                    {
                        "name": "Submit Section Attendance (Roll-Call)",
                        "request": {
                            "method": "POST",
                            "header": [
                                { "key": "Content-Type", "value": "application/json" },
                                { "key": "X-Client-Portal", "value": "admin" }
                            ],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps({
                                    "date": "2026-11-17",
                                    "records": [
                                        {
                                            "student_id": "{{student_id}}",
                                            "status": "PRESENT",
                                            "remarks": "On time"
                                        }
                                    ]
                                }, indent=2)
                            },
                            "url": {
                                "raw": "{{base_url}}/api/v1/teacher/attendance/sections/{{section_id}}",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "teacher", "attendance", "sections", "{{section_id}}"]
                            }
                        }
                    },
                    {
                        "name": "Admin Attendance Overview",
                        "request": {
                            "method": "GET",
                            "header": [],
                            "url": {
                                "raw": "{{base_url}}/api/v1/admin/attendance/overview?date=2026-11-17",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "admin", "attendance", "overview"],
                                "query": [{ "key": "date", "value": "2026-11-17" }]
                            }
                        }
                    },
                    {
                        "name": "List School Calendar Holidays",
                        "request": {
                            "method": "GET",
                            "header": [],
                            "url": {
                                "raw": "{{base_url}}/api/v1/admin/holidays",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "admin", "holidays"]
                            }
                        }
                    },
                    {
                        "name": "Create Holiday (Blocks Attendance)",
                        "request": {
                            "method": "POST",
                            "header": [{ "key": "Content-Type", "value": "application/json" }],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps({
                                    "title": "Republic Day",
                                    "holiday_date": "2027-01-26",
                                    "category": "NATIONAL",
                                    "description": "National Holiday"
                                }, indent=2)
                            },
                            "url": {
                                "raw": "{{base_url}}/api/v1/admin/holidays",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "admin", "holidays"]
                            }
                        }
                    }
                ]
            },

            # -------------------------------------------------------------
            # FOLDER 6: Fee Management & Razorpay Integration
            # -------------------------------------------------------------
            {
                "name": "6. Fee Management & Razorpay Gateway",
                "item": [
                    {
                        "name": "Fees Dashboard Summary",
                        "request": {
                            "method": "GET",
                            "header": [],
                            "url": {
                                "raw": "{{base_url}}/api/v1/fees/dashboard",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "fees", "dashboard"]
                            }
                        }
                    },
                    {
                        "name": "List Fee Structures",
                        "request": {
                            "method": "GET",
                            "header": [],
                            "url": {
                                "raw": "{{base_url}}/api/v1/fees/structures",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "fees", "structures"]
                            }
                        }
                    },
                    {
                        "name": "Get Student Fee Account Details",
                        "request": {
                            "method": "GET",
                            "header": [],
                            "url": {
                                "raw": "{{base_url}}/api/v1/fees/pos/students/{{student_id}}/details",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "fees", "pos", "students", "{{student_id}}", "details"]
                            }
                        }
                    },
                    {
                        "name": "Razorpay: Create Order (/razorpay/create-order)",
                        "request": {
                            "method": "POST",
                            "header": [
                                { "key": "Content-Type", "value": "application/json" },
                                { "key": "X-Client-Portal", "value": "parent" }
                            ],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps({
                                    "student_id": "{{student_id}}",
                                    "amount": 5000.00,
                                    "currency": "INR",
                                    "description": "Term 1 Tuition Fee"
                                }, indent=2)
                            },
                            "url": {
                                "raw": "{{base_url}}/api/v1/fees/razorpay/create-order",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "fees", "razorpay", "create-order"]
                            },
                            "description": "Initializes a Razorpay order before opening the checkout popup on the Parent Portal."
                        }
                    },
                    {
                        "name": "Razorpay: Verify Payment Signature (/razorpay/verify-payment)",
                        "request": {
                            "method": "POST",
                            "header": [
                                { "key": "Content-Type", "value": "application/json" },
                                { "key": "X-Client-Portal", "value": "parent" }
                            ],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps({
                                    "razorpay_order_id": "order_test_12345",
                                    "razorpay_payment_id": "pay_test_67890",
                                    "razorpay_signature": "mock_signature_hash",
                                    "student_id": "{{student_id}}"
                                }, indent=2)
                            },
                            "url": {
                                "raw": "{{base_url}}/api/v1/fees/razorpay/verify-payment",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "fees", "razorpay", "verify-payment"]
                            },
                            "description": "Verifies SHA-256 HMAC signature from Razorpay checkout callback and marks payment as PAID."
                        }
                    },
                    {
                        "name": "POS / Offline Fee Payment",
                        "request": {
                            "method": "POST",
                            "header": [{ "key": "Content-Type", "value": "application/json" }],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps({
                                    "student_id": "{{student_id}}",
                                    "amount_paid": 5000.00,
                                    "payment_method": "CASH",
                                    "remarks": "Counter payment"
                                }, indent=2)
                            },
                            "url": {
                                "raw": "{{base_url}}/api/v1/fees/pos/payments",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "fees", "pos", "payments"]
                            }
                        }
                    },
                    {
                        "name": "Get Receipt Details",
                        "request": {
                            "method": "GET",
                            "header": [],
                            "url": {
                                "raw": "{{base_url}}/api/v1/fees/receipts/REC-2026-0001",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "fees", "receipts", "REC-2026-0001"]
                            }
                        }
                    }
                ]
            },

            # -------------------------------------------------------------
            # FOLDER 7: Parent Portal & Child Linking
            # -------------------------------------------------------------
            {
                "name": "7. Parent Portal & Child Views",
                "item": [
                    {
                        "name": "List Linked Children",
                        "request": {
                            "method": "GET",
                            "header": [{ "key": "X-Client-Portal", "value": "parent" }],
                            "url": {
                                "raw": "{{base_url}}/api/v1/parents/my-children",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "parents", "my-children"]
                            }
                        }
                    },
                    {
                        "name": "View Child Attendance",
                        "request": {
                            "method": "GET",
                            "header": [{ "key": "X-Client-Portal", "value": "parent" }],
                            "url": {
                                "raw": "{{base_url}}/api/v1/parents/children/{{student_id}}/attendance?month=11&year=2026",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "parents", "children", "{{student_id}}", "attendance"],
                                "query": [
                                    { "key": "month", "value": "11" },
                                    { "key": "year", "value": "2026" }
                                ]
                            }
                        }
                    },
                    {
                        "name": "View Child Fees & Invoices",
                        "request": {
                            "method": "GET",
                            "header": [{ "key": "X-Client-Portal", "value": "parent" }],
                            "url": {
                                "raw": "{{base_url}}/api/v1/parents/children/{{student_id}}/fees",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "parents", "children", "{{student_id}}", "fees"]
                            }
                        }
                    }
                ]
            },

            # -------------------------------------------------------------
            # FOLDER 8: Examinations & Schedules
            # -------------------------------------------------------------
            {
                "name": "8. Examinations & Schedules",
                "item": [
                    {
                        "name": "List Examinations",
                        "request": {
                            "method": "GET",
                            "header": [],
                            "url": {
                                "raw": "{{base_url}}/api/v1/admin/examinations",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "admin", "examinations"]
                            }
                        }
                    },
                    {
                        "name": "Create Examination",
                        "request": {
                            "method": "POST",
                            "header": [{ "key": "Content-Type", "value": "application/json" }],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps({
                                    "title": "Term 1 Mid-Term Examination",
                                    "academic_year_id": "{{academic_year_id}}",
                                    "start_date": "2026-12-01",
                                    "end_date": "2026-12-15"
                                }, indent=2)
                            },
                            "url": {
                                "raw": "{{base_url}}/api/v1/admin/examinations",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "admin", "examinations"]
                            }
                        }
                    }
                ]
            },

            # -------------------------------------------------------------
            # FOLDER 9: Audit Logs & System Health
            # -------------------------------------------------------------
            {
                "name": "9. Audit Logs & System Health",
                "item": [
                    {
                        "name": "System Health Check",
                        "request": {
                            "auth": { "type": "noauth" },
                            "method": "GET",
                            "header": [],
                            "url": {
                                "raw": "{{base_url}}/health",
                                "host": ["{{base_url}}"],
                                "path": ["health"]
                            }
                        }
                    },
                    {
                        "name": "List Audit Logs",
                        "request": {
                            "method": "GET",
                            "header": [],
                            "url": {
                                "raw": "{{base_url}}/api/v1/admin/audit-logs?limit=50&offset=0",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "admin", "audit-logs"],
                                "query": [
                                    { "key": "limit", "value": "50" },
                                    { "key": "offset", "value": "0" }
                                ]
                            }
                        }
                    }
                ]
            }
        ]
    }

    # -------------------------------------------------------------
    # Environment 1: Local
    # -------------------------------------------------------------
    local_env = {
        "id": str(uuid.uuid4()),
        "name": "School Management - Local",
        "values": [
            { "key": "base_url", "value": "http://localhost:8000", "type": "default", "enabled": True },
            { "key": "access_token", "value": "", "type": "secret", "enabled": True },
            { "key": "admin_email", "value": "admin@school.com", "type": "default", "enabled": True },
            { "key": "admin_password", "value": "admin123", "type": "secret", "enabled": True },
            { "key": "teacher_email", "value": "teacher_test@example.com", "type": "default", "enabled": True },
            { "key": "teacher_password", "value": "teacher123", "type": "secret", "enabled": True },
            { "key": "parent_email", "value": "parent@example.com", "type": "default", "enabled": True },
            { "key": "parent_password", "value": "parent123", "type": "secret", "enabled": True },
            { "key": "student_id", "value": "439233b6-1453-4a01-be2a-bb1cc54c6bea", "type": "default", "enabled": True },
            { "key": "teacher_id", "value": "439233b6-1453-4a01-be2a-bb1cc54c6bea", "type": "default", "enabled": True },
            { "key": "grade_id", "value": "", "type": "default", "enabled": True },
            { "key": "section_id", "value": "", "type": "default", "enabled": True },
            { "key": "academic_year_id", "value": "", "type": "default", "enabled": True }
        ],
        "_postman_variable_scope": "environment"
    }

    # -------------------------------------------------------------
    # Environment 2: Staging / Ngrok
    # -------------------------------------------------------------
    staging_env = {
        "id": str(uuid.uuid4()),
        "name": "School Management - Staging (Ngrok)",
        "values": [
            { "key": "base_url", "value": "https://dollhouse-festival-unwilling.ngrok-free.dev", "type": "default", "enabled": True },
            { "key": "access_token", "value": "", "type": "secret", "enabled": True },
            { "key": "admin_email", "value": "admin@school.com", "type": "default", "enabled": True },
            { "key": "admin_password", "value": "admin123", "type": "secret", "enabled": True },
            { "key": "teacher_email", "value": "teacher_test@example.com", "type": "default", "enabled": True },
            { "key": "teacher_password", "value": "teacher123", "type": "secret", "enabled": True },
            { "key": "parent_email", "value": "parent@example.com", "type": "default", "enabled": True },
            { "key": "parent_password", "value": "parent123", "type": "secret", "enabled": True },
            { "key": "student_id", "value": "439233b6-1453-4a01-be2a-bb1cc54c6bea", "type": "default", "enabled": True },
            { "key": "teacher_id", "value": "439233b6-1453-4a01-be2a-bb1cc54c6bea", "type": "default", "enabled": True },
            { "key": "grade_id", "value": "", "type": "default", "enabled": True },
            { "key": "section_id", "value": "", "type": "default", "enabled": True },
            { "key": "academic_year_id", "value": "", "type": "default", "enabled": True }
        ],
        "_postman_variable_scope": "environment"
    }

    # Save Collection
    with open("School_Management_System.postman_collection.json", "w") as f:
        json.dump(collection, f, indent=2)

    # Save Local Environment
    with open("School_Management_Local.postman_environment.json", "w") as f:
        json.dump(local_env, f, indent=2)

    # Save Staging Environment
    with open("School_Management_Staging.postman_environment.json", "w") as f:
        json.dump(staging_env, f, indent=2)

    print("Postman collection and environment files generated successfully!")

if __name__ == "__main__":
    generate_postman_artifacts()
