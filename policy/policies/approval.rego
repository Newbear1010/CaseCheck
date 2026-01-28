package casecheck.authz.approval

import future.keywords.if
import future.keywords.in

default allow := false

# APPROVE
allow if {
    input.action == "activity:approve"
    input.subject.role == "ADMIN"
    input.subject.id != input.resource.creator_id
    input.resource.status == "PENDING_APPROVAL"
}

denial_reasons["Only ADMIN can approve activities"] if {
    input.action == "activity:approve"
    input.subject.role != "ADMIN"
}

denial_reasons["Separation of Duties: Cannot approve your own activity"] if {
    input.action == "activity:approve"
    input.subject.id == input.resource.creator_id
}

denial_reasons["Only PENDING_APPROVAL activities can be approved"] if {
    input.action == "activity:approve"
    input.resource.status != "PENDING_APPROVAL"
}

# REJECT
allow if {
    input.action == "activity:reject"
    input.subject.role == "ADMIN"
    input.subject.id != input.resource.creator_id
    input.resource.status == "PENDING_APPROVAL"
}

denial_reasons["Only ADMIN can reject activities"] if {
    input.action == "activity:reject"
    input.subject.role != "ADMIN"
}

denial_reasons["Separation of Duties: Cannot reject your own activity"] if {
    input.action == "activity:reject"
    input.subject.id == input.resource.creator_id
}

denial_reasons["Only PENDING_APPROVAL activities can be rejected"] if {
    input.action == "activity:reject"
    input.resource.status != "PENDING_APPROVAL"
}
