package casecheck.authz

import future.keywords.if
import future.keywords.in

# Default deny
default allow := false

# Import sub-policies
import data.casecheck.authz.activity
import data.casecheck.authz.approval
import data.casecheck.authz.attendance
import data.casecheck.authz.user

# Aggregate allow
allow if activity.allow
allow if approval.allow
allow if attendance.allow
allow if user.allow

# Collect denial reasons
reasons := array.concat(
    array.concat(array.from_set(activity.denial_reasons), array.from_set(approval.denial_reasons)),
    array.concat(array.from_set(attendance.denial_reasons), array.from_set(user.denial_reasons))
)

response := {
    "allow": allow,
    "reasons": reasons,
}
