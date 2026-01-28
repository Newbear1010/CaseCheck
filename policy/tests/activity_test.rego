package casecheck.authz.activity_test

import future.keywords.if
import data.casecheck.authz.activity

# USER can create

test_user_can_create_activity if {
    activity.allow with input as {
        "action": "activity:create",
        "subject": {"id": "user-1", "role": "USER"},
        "resource": {},
        "context": {}
    }
}

# GUEST cannot create

test_guest_cannot_create_activity if {
    not activity.allow with input as {
        "action": "activity:create",
        "subject": {"id": "guest-1", "role": "GUEST"},
        "resource": {},
        "context": {}
    }
}

# Creator can edit DRAFT

test_creator_can_edit_draft if {
    activity.allow with input as {
        "action": "activity:update",
        "subject": {"id": "user-1", "role": "USER"},
        "resource": {"creator_id": "user-1", "status": "DRAFT"},
        "context": {}
    }
}

# Non-creator cannot edit

test_non_creator_cannot_edit if {
    not activity.allow with input as {
        "action": "activity:update",
        "subject": {"id": "user-2", "role": "USER"},
        "resource": {"creator_id": "user-1", "status": "DRAFT"},
        "context": {}
    }
}

# Cannot edit rejected

test_cannot_edit_rejected if {
    not activity.allow with input as {
        "action": "activity:update",
        "subject": {"id": "user-1", "role": "USER"},
        "resource": {"creator_id": "user-1", "status": "REJECTED"},
        "context": {}
    }
}

# Creator can submit DRAFT

test_creator_can_submit_draft if {
    activity.allow with input as {
        "action": "activity:submit",
        "subject": {"id": "user-1", "role": "USER"},
        "resource": {"creator_id": "user-1", "status": "DRAFT"},
        "context": {}
    }
}

# Cannot submit non-DRAFT

test_cannot_submit_approved if {
    not activity.allow with input as {
        "action": "activity:submit",
        "subject": {"id": "user-1", "role": "USER"},
        "resource": {"creator_id": "user-1", "status": "APPROVED"},
        "context": {}
    }
}
