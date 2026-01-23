package casecheck.authz.attendance_test

import future.keywords.if
import data.casecheck.authz.attendance

# Can register for approved

test_can_register_approved if {
    attendance.allow with input as {
        "action": "attendance:register",
        "subject": {"id": "user-1", "role": "USER"},
        "resource": {"status": "APPROVED"},
        "context": {}
    }
}

# Cannot register for draft

test_cannot_register_draft if {
    not attendance.allow with input as {
        "action": "attendance:register",
        "subject": {"id": "user-1", "role": "USER"},
        "resource": {"status": "DRAFT"},
        "context": {}
    }
}

# Registered user can check in

test_registered_can_checkin if {
    attendance.allow with input as {
        "action": "attendance:checkin",
        "subject": {"id": "user-1", "role": "USER"},
        "resource": {"activity_status": "IN_PROGRESS"},
        "context": {"is_registered": true}
    }
}

# Unregistered user cannot check in

test_unregistered_cannot_checkin if {
    not attendance.allow with input as {
        "action": "attendance:checkin",
        "subject": {"id": "user-1", "role": "USER"},
        "resource": {"activity_status": "IN_PROGRESS"},
        "context": {"is_registered": false}
    }
}

# Creator can generate QR

test_creator_can_generate_qr if {
    attendance.allow with input as {
        "action": "attendance:generate_qr",
        "subject": {"id": "user-1", "role": "USER"},
        "resource": {"creator_id": "user-1"},
        "context": {}
    }
}

# Non-creator non-admin cannot generate QR

test_non_creator_cannot_generate_qr if {
    not attendance.allow with input as {
        "action": "attendance:generate_qr",
        "subject": {"id": "user-2", "role": "USER"},
        "resource": {"creator_id": "user-1"},
        "context": {}
    }
}
