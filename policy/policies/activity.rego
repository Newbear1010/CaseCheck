package casecheck.authz.activity

import future.keywords.if
import future.keywords.in

default allow := false
denial_reasons := set()

# CREATE
allow if {
    input.action == "activity:create"
    input.subject.role in ["USER", "ADMIN"]
}

denial_reasons["Only USER or ADMIN can create activities"] if {
    input.action == "activity:create"
    not input.subject.role in ["USER", "ADMIN"]
}

# READ
allow if {
    input.action == "activity:read"
    input.resource.status in ["APPROVED", "IN_PROGRESS", "COMPLETED"]
}

allow if {
    input.action == "activity:read"
    input.subject.id == input.resource.creator_id
}

allow if {
    input.action == "activity:read"
    input.subject.role == "ADMIN"
}

# UPDATE
allow if {
    input.action == "activity:update"
    input.subject.id == input.resource.creator_id
    input.resource.status == "DRAFT"
}

denial_reasons["Only the creator can update this activity"] if {
    input.action == "activity:update"
    input.subject.id != input.resource.creator_id
}

denial_reasons["Cannot update activity in this status"] if {
    input.action == "activity:update"
    input.resource.status != "DRAFT"
}

denial_reasons["REJECTED activities are immutable"] if {
    input.action == "activity:update"
    input.resource.status == "REJECTED"
}

# DELETE
allow if {
    input.action == "activity:delete"
    input.subject.id == input.resource.creator_id
    input.resource.status == "DRAFT"
}

denial_reasons["Only the creator can delete this activity"] if {
    input.action == "activity:delete"
    input.subject.id != input.resource.creator_id
}

denial_reasons["Can only delete DRAFT activities"] if {
    input.action == "activity:delete"
    input.resource.status != "DRAFT"
}

# SUBMIT
allow if {
    input.action == "activity:submit"
    input.subject.id == input.resource.creator_id
    input.resource.status == "DRAFT"
}

denial_reasons["Only the creator can submit for approval"] if {
    input.action == "activity:submit"
    input.subject.id != input.resource.creator_id
}

denial_reasons["Only DRAFT activities can be submitted"] if {
    input.action == "activity:submit"
    input.resource.status != "DRAFT"
}

# LIST
allow if {
    input.action == "activity:list"
}
