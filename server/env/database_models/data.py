from typing import List, Dict, Optional
from pydantic import BaseModel, Field, EmailStr, constr, validator
from datetime import datetime


# For individual readings associated with gauges or sensors
class Reading(BaseModel):
    timestamp: str
    value: float
    unit: Optional[str] = None
    readingImage: Optional[str] = None  # Image associated with the reading itself (optional)

class AlertHistory(BaseModel):
    status: str
    timestamp: datetime  # When the alert was triggered
    reading: float  # The reading that triggered the alert

# For regions of interest (ROI) in a source feed
class Roi(BaseModel):
    roi_id: str
    readings: Optional[List[Reading]] = None
    thresholds: Optional[Dict[str, float]] = None # Min/Max threshold values
    roiImage: Optional[str] = None  # Image or thumbnail of the ROI
    alertHistory: Optional[List[AlertHistory]] = Field(default_factory=list)

# For sources of readings (cameras, video files, etc.)
class Source(BaseModel):
    sourceName: str
    sourceType: str  # "ip_camera", "camera", "local_video", "online_streams"
    sourcePath: str
    megaFile: Optional[str] = None
    belongType: str = "personal" #personal, company, department
    belongId: str #user_id, company_id
    visibleToDepartments: Optional[List[str]] = Field(default_factory=list)  # List of department IDs that can access this source
    rois: Optional[List[Roi]] = Field(default_factory=list) # Multiple regions of interest
    alertUsers: Optional[List[str]] = Field(default_factory=list)  # List of users (IDs) that can receive the alerts
    status: str = "active"

# User preferences for alerts
class AlertPreferences(BaseModel):
    email: bool = False # Email notifications
    sms: bool = False  # SMS notifications

# For user accounts, including company and personal types
class User(BaseModel):
    email: EmailStr  # Use Pydantic's EmailStr for email validation
    password: str
    username: str
    phone: str = Field(..., pattern=r'^(\+?6?01)[0-46-9]-*[0-9]{7,8}$')
    accountType: str  # "personal" or "company"
    companyId: Optional[str] = None  # Unique identifier for the company they belong to
    departments: Optional[List[str]] = Field(default_factory=list)  # List of department IDs they belong to
    alertPreferences: AlertPreferences = Field(default_factory=AlertPreferences) # Notification preferences
    role: Optional[str] = "user"  # Role of the user (e.g., admin, user)
    lastLogin: Optional[datetime] = None  # Timestamp of the last login
    failedLoginAttempts: Optional[int] = 0  # Counter for failed login attempts
    sources: Optional[List[Source]] = Field(default_factory=list)
    reset_token: Optional[str] = ""
    reset_token_expiry: Optional[datetime] = None

# For managing departments within a company account
class Department(BaseModel):
    name: str
    company_id: str
    users: Optional[List[str]] = [] # List of users in the department (by email or username)

class DepartmentsRequest(BaseModel):
    departments: List[str]
    company_id: str

class Company(BaseModel):
    name: str  # Company name
    address1: str  # Company address
    address2: Optional[str] = None  # Company phone number (optional)
    postcode: str
    city: str
    state: str

# For login requests and handling
class Login(BaseModel):
    username: str
    password: str

# For token handling in authentication
class Token(BaseModel):
    access_token: str
    token_type: str

# To store token data and user information
class TokenData(BaseModel):
    username: Optional[str] = None

class VerifyPasswordRequest(BaseModel):
    current_password: str

class ChangePasswordRequest(BaseModel):
    new_password: str

class UpdateUserRequest(BaseModel):
    email: str
    phone: str

class ForgotPasswordRequest(BaseModel):
    user: str

class ResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str

class UpdateSourcePathRequest(BaseModel):
    source_id: str
    source_path: str

class SourceValidationRequest(BaseModel):
    sourcePath: str

class DeleteMegaRequest(BaseModel):
    sourcePath: str

class CreateReaderRequest(BaseModel):
    source_id: str
    source_type: str
    source_path: str
    user: str

class DeleteReaderRequest(BaseModel):
    source_id: str

class UserUpdate(BaseModel):
    role: str

# Model for UpdateStatusRequest
class UpdateStatusRequest(BaseModel):
    status: str

# Model for UpdateDepartmentsRequest
class UpdateDepartmentsRequest(BaseModel):
    departments: List[str]

# Model for UpdateAlertPreferencesRequest
class UpdateAlertPreferencesRequest(BaseModel):
    email: bool = False  # Email notifications
    sms: bool = False  # SMS notifications

# Model for UpdateAlertUsersRequest
class UpdateAlertUsersRequest(BaseModel):
    alertUsers: List[str]

# Model for DepartmentFilter
class DepartmentFilter(BaseModel):
    companyId: str
    departments: List[str]

class Thresholds(BaseModel):
    min_value: Optional[float] = None
    max_value: Optional[float] = None