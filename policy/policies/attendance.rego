package casecheck.authz.attendance

import future.keywords.if
import future.keywords.in

default allow := false
denial_reasons := set()

# REGISTER
allow if {
    input.action == "attendance:register"
    input.subject.role in ["USER", "GUEST", "ADMIN"]
    input.resource.status in ["APPROVED", "IN_PROGRESS"]
}

denial_reasons["Can only register for APPROVED or IN_PROGRESS activities"] if {
    input.action == "attendance:register"
    not input.resource.status in ["APPROVED", "IN_PROGRESS"]
}

# CHECK-IN
allow if {
    input.action == "attendance:checkin"
    input.resource.activity_status == "IN_PROGRESS"
    input.context.is_registered == true
}

denial_reasons["Activity is not currently in progress"] if {
    input.action == "attendance:checkin"
    input.resource.activity_status != "IN_PROGRESS"
}

denial_reasons["Must be registered for this activity"] if {
    input.action == "attendance:checkin"
    input.context.is_registered != true
}

# CHECK-OUT
allow if {
    input.action == "attendance:checkout"
    input.context.is_checked_in == true
}

denial_reasons["Must be checked in first"] if {
    input.action == "attendance:checkout"
    input.context.is_checked_in != true
}

# GENERATE QR
allow if {
    input.action == "attendance:generate_qr"
    input.subject.id == input.resource.creator_id
}

allow if {
    input.action == "attendance:generate_qr"
    input.subject.role == "ADMIN"
}

denial_reasons["Only creator or ADMIN can generate QR codes"] if {
    input.action == "attendance:generate_qr"
    input.subject.id != input.resource.creator_id
    input.subject.role != "ADMIN"
}

# VIEW ATTENDANCE
allow if {
    input.action == "attendance:view"
    input.subject.id == input.resource.creator_id
}

allow if {
    input.action == "attendance:view"
    input.subject.role == "ADMIN"
}

allow if {
    input.action == "attendance:view"
    input.context.is_participant == true
}

# VALIDATE QR
allow if {
    input.action == "attendance:validate_qr"
    input.subject.role in ["USER", "GUEST", "ADMIN"]
}
