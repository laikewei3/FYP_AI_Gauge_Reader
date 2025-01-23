def user_serial(item: dict) -> dict:
    return {
        "id": str(item.get("_id")) if item.get("_id") is not None else None,  # Convert ObjectId to string or None
        "email": item.get("email", ""),  # Default to empty string if not present
        "username": item.get("username", ""),  # Default to empty string if not present
        "phone": item.get("phone", ""),  # Default to empty string if not present
        "accountType": item.get("accountType", ""),  # Default to empty string if not present
        "companyId": str(item.get("companyId")) if item.get("companyId") is not None else None,  # Convert to string or None
        "departments": item.get("departments", []),  # Default to empty list if not present
        "role": item.get("role", "user"),  # Default to 'user' if not present
        "lastLogin": item.get("lastLogin", None),  # Default to None if not present
        "failedLoginAttempts": item.get("failedLoginAttempts", 0),  # Default to 0 if not present
        "sources": [source_serial(source) for source in item.get("sources", [])],  # Default to empty list if not present
        "alertPreferences": alert_preferences_serial(item.get("alertPreferences", {}))  # Default to empty dict if not present
    }

def reading_serial(reading: dict) -> dict:
    return {
        "timestamp": reading.get("timestamp"),
        "value": reading.get("value"),
        "unit": reading.get("unit"),
        "coordinates": reading.get("coordinates", []),
        "readingImage": reading.get("readingImage", None)
    }


def alert_history_serial(alert_history: dict) -> dict:
    return {
        "status": alert_history.get("status"),
        "timestamp": alert_history.get("timestamp"),
        "reading": alert_history.get("reading"),
    }


def roi_serial(roi: dict) -> dict:
    return {
        # "_id": str(roi.get("_id")),
        "roi_id": roi.get("roi_id"),
        "readings": [reading_serial(reading) for reading in roi.get("readings", [])],
        "thresholds": roi.get("thresholds",[]),
        "roiImage": roi.get("roiImage", None),
        "alert_history": [alert_history_serial(alert) for alert in roi.get("alert_history", [])],
    }

def gauge_data_serial(gaugeData: dict) -> dict:
    return {
        "gauge_properties": gaugeData.get("gauge_properties"),
        "ocr_data": gaugeData.get("ocr_data"),
        "base_min_max_data": gaugeData.get("base_min_max_data"),
        "needle_data": gaugeData.get("needle_data"),
        "scale_mark_angles": gaugeData.get("scale_mark_angles")
    }


def source_serial(source: dict) -> dict:
    return {
        "sourceId": str(source.get("_id")),
        "sourceName": source.get("sourceName"),
        "sourceType": source.get("sourceType"),
        "sourcePath": source.get("sourcePath"),
        "megaFile": source.get("megaFile") if source.get("megaFile") is not None else None,
        "belongType": source.get("belongType"),
        "belongId": source.get("belongId"),
        "rois": [roi_serial(roi) for roi in source.get("rois", [])],
        "visibleToDepartments": source.get("visibleToDepartments"),
        "status": source.get("status")
    }


def alert_preferences_serial(alert_preferences: dict) -> dict:
    return {
        "email": alert_preferences.get("email"),
        "sms": alert_preferences.get("sms")
    }
  
def department_serial(department: dict) -> dict:
    return {
        "departmentId": str(department.get("_id")),
        "name": department.get("name"),
        "company_id": department.get("company_id"),
        "users": department.get("users"),
        # "alertSettings": department.get("alertSettings")
    }


def company_serial(company: dict) -> dict:
    return {
        "_id": str(company.get("_id")),  # Convert ObjectId to string
        "name": company.get("name"),
        "address1": company.get("address1"),
        "address2": company.get("address2"),
        "postcode": company.get("postcode"),
        "city": company.get("city"),
        "state": company.get("state"),
        # "departments": [department_serial(department) for department in company.get("departments", [])],
    }


def event_log_serial(event_log: dict) -> dict:
    return {
        "eventId": event_log.get("_id"),
        "timestamp": event_log.get("timestamp").isoformat() if event_log.get("timestamp") else None,
        "userId": event_log.get("userId"),
        "eventType": event_log.get("eventType"),
        "details": event_log.get("details")
    }


def login_serial(login: dict) -> dict:
    return {
        "username": login.get("username"),
        "password": login.get("password")  # Consider hashing or not exposing raw passwords
    }

def token_serial(token: dict) -> dict:
    return {
        "access_token": token.get("access_token"),
        "token_type": token.get("token_type")
    }


def token_data_serial(token_data: dict) -> dict:
    return {
        "username": token_data.get("username")
    }

