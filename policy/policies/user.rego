package casecheck.authz.user

import future.keywords.if
import future.keywords.in

default allow := false
denial_reasons := set()

# READ OWN PROFILE
allow if {
    input.action == "user:read_self"
}

# UPDATE OWN PROFILE
allow if {
    input.action == "user:update_self"
}

# LIST USERS
allow if {
    input.action == "user:list"
    input.subject.role == "ADMIN"
}

denial_reasons["Only ADMIN can list users"] if {
    input.action == "user:list"
    input.subject.role != "ADMIN"
}

# READ OTHER USER
allow if {
    input.action == "user:read"
    input.subject.role == "ADMIN"
}

denial_reasons["Only ADMIN can view other user profiles"] if {
    input.action == "user:read"
    input.subject.role != "ADMIN"
}

# MANAGE USERS
allow if {
    input.action == "user:manage"
    input.subject.role == "ADMIN"
}

denial_reasons["Only ADMIN can manage users"] if {
    input.action == "user:manage"
    input.subject.role != "ADMIN"
}
