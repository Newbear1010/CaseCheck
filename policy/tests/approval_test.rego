package casecheck.authz.approval_test

import future.keywords.if
import data.casecheck.authz.approval

# ADMIN can approve pending (not own)

test_admin_can_approve_pending if {
    approval.allow with input as {
        "action": "activity:approve",
        "subject": {"id": "admin-1", "role": "ADMIN"},
        "resource": {"creator_id": "user-1", "status": "PENDING_APPROVAL"},
        "context": {}
    }
}

# SoD - ADMIN cannot approve own

test_admin_cannot_approve_own if {
    not approval.allow with input as {
        "action": "activity:approve",
        "subject": {"id": "admin-1", "role": "ADMIN"},
        "resource": {"creator_id": "admin-1", "status": "PENDING_APPROVAL"},
        "context": {}
    }
}

# USER cannot approve

test_user_cannot_approve if {
    not approval.allow with input as {
        "action": "activity:approve",
        "subject": {"id": "user-1", "role": "USER"},
        "resource": {"creator_id": "user-2", "status": "PENDING_APPROVAL"},
        "context": {}
    }
}

# Cannot approve already approved

test_cannot_approve_approved if {
    not approval.allow with input as {
        "action": "activity:approve",
        "subject": {"id": "admin-1", "role": "ADMIN"},
        "resource": {"creator_id": "user-1", "status": "APPROVED"},
        "context": {}
    }
}

# ADMIN can reject pending (not own)

test_admin_can_reject_pending if {
    approval.allow with input as {
        "action": "activity:reject",
        "subject": {"id": "admin-1", "role": "ADMIN"},
        "resource": {"creator_id": "user-1", "status": "PENDING_APPROVAL"},
        "context": {}
    }
}

# SoD - ADMIN cannot reject own

test_admin_cannot_reject_own if {
    not approval.allow with input as {
        "action": "activity:reject",
        "subject": {"id": "admin-1", "role": "ADMIN"},
        "resource": {"creator_id": "admin-1", "status": "PENDING_APPROVAL"},
        "context": {}
    }
}
