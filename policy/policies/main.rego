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
activity_reasons := [reason | reason := activity.denial_reasons[_]]
approval_reasons := [reason | reason := approval.denial_reasons[_]]
attendance_reasons := [reason | reason := attendance.denial_reasons[_]]
user_reasons := [reason | reason := user.denial_reasons[_]]

reasons := array.concat(
    array.concat(activity_reasons, approval_reasons),
    array.concat(attendance_reasons, user_reasons)
)

response := {
    "allow": allow,
    "reasons": reasons,
}
