from fastapi import (
    APIRouter, 
    HTTPException, 
    Depends, 
    Request, 
    File, 
    UploadFile, 
    WebSocket, 
    WebSocketDisconnect,
    Form, Query
    )
from database_models.data import (
    Source, 
    SourceValidationRequest, 
    UpdateSourcePathRequest, 
    ResetPasswordRequest, 
    ForgotPasswordRequest, 
    UpdateUserRequest, 
    ChangePasswordRequest, 
    VerifyPasswordRequest, 
    User, 
    Company,
    DepartmentsRequest,
    DeleteMegaRequest,
    CreateReaderRequest,
    Thresholds,
    UserUpdate,
    UpdateStatusRequest,
    UpdateDepartmentsRequest,
    UpdateAlertPreferencesRequest,
    UpdateAlertUsersRequest,
    DepartmentFilter)
from schema.schemas import (
    user_serial,
    source_serial,
    department_serial,
    company_serial,
)
import aiosmtplib
from pydantic import EmailStr
from bson import ObjectId
from fastapi.security import OAuth2PasswordRequestForm
from schema.hashing import Hash
from schema.jwttoken import create_access_token  # Adjust imports for security-related functions
from typing import Dict, List, Optional
import re
from schema.oauth import get_current_user
from datetime import datetime, timedelta, timezone
import secrets
from email.message import EmailMessage
import os
import cv2
import yt_dlp
import sys
sys.path.append(r'C:/Users/Wei/Downloads/AI_Gauge_Reader')
from model.Reader import Reader

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()
router = APIRouter()
# Define the regex pattern for email validation
email_regex = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')

async def user_exists(email: str, username: str, request: Request):
    user = await request.app.database["users"].find_one({"$or": [{"email": email}, {"username": username}]})
    return user is not None

@router.get("/user_exists/{email}", response_model=bool)
async def user_exists_email(email: str, request: Request):
    user = await request.app.database["users"].find_one({"email": email})
    return user is not None

@router.get("/user_exists_email_username/{user}", response_model=dict)
async def user_exists_email_username(user: str, request: Request):
    # Determine if the username provided is an email
    is_email = email_regex.match(user) is not None
    query = {"email": user} if is_email else {"username": user}
    
    # Find the user in the database
    user_in_db = await request.app.database["users"].find_one(query)

    # Always return a 200 response with a boolean indicating if the user exists
    return {"user_exists": user_in_db is not None}

@router.get("/")
async def read_root(current_user:User = Depends(get_current_user)):
	return {"data": current_user}

@router.post('/register', response_model=dict)
async def create_user(request_body: User, request: Request):
    if await user_exists(request_body.email, request_body.username, request):
        raise HTTPException(status_code=400, detail="Email or username already exists")
    hashed_pass = Hash.bcrypt(request_body.password)
    user_object = request_body.dict()
    user_object["password"] = hashed_pass
    user_id = await request.app.database["users"].insert_one(user_object)
    request.app.mega.create_folder(request_body.username)
    return {"res": "created", "user_id": str(user_id.inserted_id)}

@router.post('/login', response_model=dict)
async def login(request:OAuth2PasswordRequestForm = Depends(), request_app: Request = None):
    # Determine if the username provided is an email
    is_email = email_regex.match(request.username) is not None
    query = {"email": request.username} if is_email else {"username": request.username}
    
    user = await request_app.app.database["users"].find_one(query)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user["role"] == "pending":
        raise HTTPException(status_code=403, detail="Account pending approval")
    
    if not Hash.verify(user["password"], request.password):
        raise HTTPException(status_code=404, detail="Incorrect password")
    
    access_token = create_access_token(data={"sub": user["username"]})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/", response_model=List[User])
async def get_all_users(request: Request):
    users_cursor = request.app.database["users"].find()
    users = await users_cursor.to_list() 
    return [user_serial(user) for user in users]

@router.get("/check-username/{username}",response_model=dict)
async def check_username(username: str, request: Request):
    user = await request.app.database["users"].find_one({"username": username})
    if user:
        raise HTTPException(status_code=400, detail="Username is already taken")
    return {"message": "Username is available"}

@router.post("/forgot_password/", response_model=dict)
async def forgot_password(data: ForgotPasswordRequest, request: Request):
    user = data.user
    is_email = email_regex.match(user) is not None
    print("is_email:",is_email)

    query = {"email": user} if is_email else {"username": user}
    print("query:",query)
    
    # Find the user based on the email or username
    user = await request.app.database["users"].find_one(query)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    print("Find user.")

    # Generate a secure reset token
    reset_token = secrets.token_urlsafe(32)  # Generate a secure token
    print("reset_token:", reset_token)

    reset_token_expiry = datetime.now(timezone.utc) + timedelta(hours=1)  # Token expires in 1 hour
    print("reset_token_expiry:", reset_token_expiry)

    # Update the user document with the reset token and expiry
    await request.app.database["users"].update_one(
        {"_id": user["_id"]},
        {"$set": {"reset_token": reset_token, "reset_token_expiry": reset_token_expiry}}
    )

    # Construct the reset link (replace with actual domain)
    reset_link = f"http://localhost:5173/ResetPassword/{reset_token}"
    print("reset_link:", reset_link)
    html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }}
        .email-container {{
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }}
        .email-header {{
            text-align: center;
            padding-bottom: 20px;
        }}
        .email-body {{
            padding: 20px;
            color: #333333;
        }}
        .button {{
            display: inline-block;
            padding: 10px 20px;
            margin-top: 20px;
            background-color: #007bff;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
        }}
        .button:hover {{
            background-color: #0056b3;
        }}
        .email-footer {{
            text-align: center;
            color: #888888;
            padding-top: 20px;
            font-size: 12px;
        }}
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h2>Password Reset Request</h2>
        </div>
        <div class="email-body">
            <p>Hello,</p>
            <p>We received a request to reset your password. Click the button below to reset it:</p>
            <a href="{reset_link}" class="button">Reset Password</a>
            <p>If you did not request this, please ignore this email. Your password will remain unchanged.</p>
            <p>For security reasons, this link will expire in 1 hour.</p>
        </div>
        <div class="email-footer">
            <p>&copy; 2024 InsightGauge. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""

    # Send reset link via email using Aiohttp + SMTP
    await send_email(user["email"], "InsightGauge: Password Reset Request", html)

    return {"message": "Password reset link has been sent to your email."}

async def send_email(to_email: str, subject: str, html_content: str):
    smtp_server = "smtp.gmail.com"
    smtp_port = 587
    smtp_username = "laikewei3@gmail.com"  # Replace with your email
    smtp_password = "yvlq qzdy djwg wcmk"  # Replace with your App Password

    # Construct the email message
    message = EmailMessage()
    message["From"] = smtp_username
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content("This is a password reset email")  # Optional plain text version
    message.add_alternative(html_content, subtype="html")  # HTML content

    # Send the email
    try:
        await aiosmtplib.send(
            message,
            hostname=smtp_server,
            port=smtp_port,
            username=smtp_username,
            password=smtp_password,
            start_tls=True
        )
        print("Email sent successfully")
    except Exception as e:
        print(f"Failed to send email: {e}")

@router.get("/users_by_username/{username}", response_model=dict)
async def get_user_by_username(username: str, request: Request):
    item = await request.app.database["users"].find_one({"username": username})
    if not item:
        raise HTTPException(status_code=404, detail="User not found")
    return user_serial(item)

@router.get("/users_by_company/{companyid}", response_model=list)
async def get_user_by_company(companyid: str, request: Request):
    users_cursor = request.app.database["users"].find({"companyId": companyid})
    users = await users_cursor.to_list()  # Convert the cursor to a list

    if not users:
        raise HTTPException(status_code=404, detail="No users found for this company")

    return [user_serial(user) for user in users]  # Assuming you have a user_serial function to format the output

@router.put("/users_profile/{id}", response_model=dict)
async def update_user_info(id: str, user_request: UpdateUserRequest, request: Request):
    # Create a dictionary to hold the fields to update
    update_fields = {
        "email": user_request.email,
        "phone": user_request.phone
    }

    # Check if there's any field to update
    if not update_fields or all(value is None for value in update_fields.values()):
        raise HTTPException(status_code=400, detail="No fields to update")

    result = await request.app.database["users"].find_one_and_update(
        {"_id": ObjectId(id)},
        {"$set": update_fields},
        return_document=True
    )

    if not result:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "User information updated successfully"}

@router.post("/users_verify-password/{id}", response_model=bool)
async def verify_password(id: str, password_data: VerifyPasswordRequest, request: Request):
    user = await request.app.database["users"].find_one({"_id": ObjectId(id)})
    if not user or not Hash.verify(user['password'], password_data.current_password):
        return False
    return True

@router.put("/users_change_password/{id}", response_model=dict)
async def change_password(id: str, password_data: ChangePasswordRequest, request: Request):
    hashed_new_password = Hash.bcrypt(password_data.new_password)  # Use your hashing function here
    result = await request.app.database["users"].find_one_and_update(
        {"_id": ObjectId(id)},
        {"$set": {"password": hashed_new_password}},
        return_document=True
    )

    if not result:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "Password changed successfully"}

@router.post("/reset_password/", response_model=dict)
async def reset_password(payload: ResetPasswordRequest, request: Request):
    # Extract token and new password from the request body
    reset_token = payload.reset_token
    new_password = payload.new_password

    # Find the user based on the reset token
    user = await request.app.database["users"].find_one({"reset_token": reset_token})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid reset token")

    # Ensure that user["reset_token_expiry"] is timezone-aware
    reset_token_expiry = user["reset_token_expiry"]
    # If reset_token_expiry is naive, make it aware
    if reset_token_expiry.tzinfo is None:
        reset_token_expiry = reset_token_expiry.replace(tzinfo=timezone.utc)
    # Check if the token has expired
    if datetime.now(timezone.utc) > reset_token_expiry:
        raise HTTPException(status_code=400, detail="Reset token has expired")

    # Hash the new password and update the user's password
    hashed_password = Hash.bcrypt(new_password)  # Use your password hashing function

    # Update the user record with the new password and clear the reset token fields
    await request.app.database["users"].update_one(
        {"_id": user["_id"]},
        {"$set": {"password": hashed_password}, "$unset": {"reset_token": "", "reset_token_expiry": ""}}
    )
    return {"message": "Password has been reset successfully"}

@router.put("/users_departments/{id}", response_model=dict)
async def update_user_departments(id: str, request: Request, body: UpdateDepartmentsRequest):
    # Update the user's departments
    result = await request.app.database["users"].find_one_and_update(
        {"_id": ObjectId(id)},
        {"$set": {"departments": body.departments}},
        return_document=True
    )

    if not result:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "User departments updated successfully"}

# Register a company (DONE)
@router.post("/register_company", response_model=dict)
async def create_company(company: Company, request: Request):
    # Omit address2 if it is an empty string
    if company.address2 == "":
        company.address2 = None
    company_id = await request.app.database["companies"].insert_one(dict(company))
    return {"message": "Company registered", "company_id": str(company_id.inserted_id)}

# Get all companies
@router.get("/companies/", response_model=list)
async def get_all_companies(request: Request):
    companies_cursor = request.app.database["companies"].find()
    companies = await companies_cursor.to_list()
    return [company_serial(company) for company in companies]

# Get company by ID
@router.get("/companies/{id}", response_model=dict)
async def get_company(id: str, request: Request):
    company = await request.app.database["companies"].find_one({"_id": ObjectId(id)})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company_serial(company)

@router.post("/departments/", response_model=dict)
async def create_departments(department_request: DepartmentsRequest, request: Request):
    inserted_dept = []
    
    for department in department_request.departments:
        department_data = {
            "name": department,
            "company_id": department_request.company_id
        }
        
        # Check if department already exists
        if await department_exists(department, department_request.company_id, request):
            raise HTTPException(status_code=400, detail="Department already exists")
        
        # Attempt to insert the department
        result = await request.app.database["departments"].insert_one(department_data)
        if result.inserted_id:
            inserted_dept.append(department_data["name"])

    # If no departments were inserted, raise an error
    if not inserted_dept:
        raise HTTPException(status_code=500, detail="Failed to create departments")

    return {"data": inserted_dept}

@router.delete("/departments/", response_model=dict)
async def delete_departments(department_request: DepartmentsRequest, request: Request):
    deleted_dept = []
    
    for department in department_request.departments:
        # Check if the department exists
        existing_department = await request.app.database["departments"].find_one({
            "name": department,
            "company_id": department_request.company_id
        })

        if not existing_department:
            raise HTTPException(status_code=404, detail=f"Department '{department}' not found")

        # Attempt to delete the department
        result = await request.app.database["departments"].delete_one({
            "name": department,
            "company_id": department_request.company_id
        })

        if result.deleted_count > 0:
            deleted_dept.append(department)

    # If no departments were deleted, raise an error
    if not deleted_dept:
        raise HTTPException(status_code=500, detail="Failed to delete departments")

    return {"data": deleted_dept}

@router.get("/departments/{company_id}/{department_name}", response_model=bool)
async def department_exists(department_name: str, company_id: str, request: Request):
    result = await request.app.database["departments"].find_one({
        "name": department_name,
        "company_id": company_id
    })
    return result is not None

@router.get("/company_departments/{company_id}", response_model=list)
async def get_all_departments_by_company_id(company_id: str, request: Request):
    result_cursor = request.app.database["departments"].find({"company_id": company_id})
    result = await result_cursor.to_list()  # Convert the cursor to a list
    return [department_serial(res) for res in result]

@router.get("/user_departments/{user_id}", response_model=List[dict])
async def get_user_departments(user_id: str, request: Request):
    user = await request.app.database["users"].find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user["role"] == "admin":
        departments = await request.app.database["departments"].find({"company_id": user["companyId"]}).to_list(length=None)
    else:
        departments = await request.app.database["departments"].find({"_id": {"$in": [ObjectId(dep_id) for dep_id in user["departments"]]}}).to_list(length=None)
    
    return [department_serial(res) for res in departments]

@router.post("/add-source/", response_model=dict)
async def add_source(source: Source, request: Request):
    # Insert the source into the MongoDB collection
    result = await request.app.database["sources"].insert_one(source.dict())
    if result.inserted_id:
        # new_source = {"source_id": str(result.inserted_id), "source": source.dict()}
        # await manager.broadcast(json.dumps(new_source))
        return {"message": "Source added successfully", "source_id": str(result.inserted_id)}
    raise HTTPException(status_code=500, detail="Error adding source")

@router.get("/all-sources/", response_model=List[dict])
async def get_all_sources(userId: str, request: Request, companyId: Optional[str] = ""):
    query = {"belongId": userId} if not companyId else {"belongId": {"$in": [userId, companyId]}}

    sources = await request.app.database["sources"].find(query).to_list(length=None)
    return  [source_serial(source) for source in sources]

@router.delete("/delete-source/{source_id}", response_model=dict)
async def delete_source(source_id: str, request: Request):
    # Delete the source from the MongoDB collection
    result = await request.app.database["sources"].delete_one({"_id": ObjectId(source_id)})
    return {"message": "Source deleted successfully"}

@router.put("/update_source_path/", response_model=dict)
async def update_source(source:UpdateSourcePathRequest, request: Request):
    result = await request.app.database["sources"].find_one_and_update(
        {"_id": ObjectId(source.source_id)},
        {"$set": {"megaFile": source.source_path}},
        return_document=True
    )

    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "Source updated successfully"}

@router.get("/get_source/{source_id}")
async def get_source(source_id: str, request: Request):
    source = await request.app.database["sources"].find_one({"_id": ObjectId(source_id)})
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    # Serialize the ROI data
    source = source_serial(source)

    return {"sourceId": source_id, "rois": source["rois"], "belongType": source["belongType"], "belongId": source["belongId"], "alertUsers": source["alertUsers"], "visibleToDepartments": source["visibleToDepartments"]}

@router.post("/update_source_status")
async def update_source_status(body: UpdateStatusRequest, request: Request):
    source_id = body.source_id
    status = body.status

    result = await request.app.database["sources"].update_one(
        {"_id": ObjectId(source_id)},
        {"$set": {"status": status}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Source not found or status not updated")

    return {"message": "Source status updated successfully"}

@router.put("/update_thresholds/{source_id}/{roi_id}")
async def update_thresholds(source_id: str, roi_id: str, thresholds: Thresholds, request: Request):
    # Find the source document by its ID
    source = await request.app.database["sources"].find_one({"_id": ObjectId(source_id)})
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    # Find the specific ROI in the source document
    roi = next((r for r in source["rois"] if r["roi_id"] == roi_id), None)
    if not roi:
        raise HTTPException(status_code=404, detail="ROI not found")

    result = await request.app.database["sources"].update_one(
        {"_id": ObjectId(source_id), "rois.roi_id": roi_id},
        {"$set": {'rois.$.thresholds': thresholds.dict()}}
    )
    
    if result.modified_count > 0:
        return {"message": "Thresholds updated successfully", "roi_id": roi_id, "thresholds": thresholds.dict()}
    else:
        raise HTTPException(status_code=500, detail="Failed to update thresholds")

@router.post("/upload-to-mega/")
async def upload_to_mega(request: Request, file: UploadFile = File(...), username: str = Form(...)):
    try:
        # Define user-specific temporary folder
        temp_folder = os.path.join("temp", username)
        os.makedirs(temp_folder, exist_ok=True)  # Create user folder if it doesn't exist
        
        # Save the file locally
        file_location = os.path.join(temp_folder, file.filename)
        with open(file_location, "wb+") as f:
            f.write(await file.read())

        # Ensure file was saved correctly
        if not os.path.exists(file_location):
            raise HTTPException(status_code=400, detail="File save failed, invalid file location.")

        # Check if the folder with the username exists in Mega
        user_folder = request.app.mega.find(username)
        if not user_folder:
            user_folder = request.app.mega.create_folder(username)
            # Upload the file to the user-specific folder in Mega
            uploaded_file = request.app.mega.upload(file_location, user_folder[username])
        else:
            # Upload the file to the user-specific folder in Mega
            uploaded_file = request.app.mega.upload(file_location, user_folder[0])
        if not uploaded_file:
            raise HTTPException(status_code=500, detail="Upload to Mega failed.")

        # # Get the download link from Mega
        # download_link = request.app.mega.get_upload_link(uploaded_file)
        # if not download_link:
        #     raise HTTPException(status_code=500, detail="Failed to retrieve the download link.")

        # return {"download_link": download_link}
        return {"fileLocation": [username, file.filename]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
    finally:
        # Clean up: Remove the locally saved file and folder if empty
        if os.path.exists(file_location):
            os.remove(file_location)
        if os.path.exists(temp_folder) and not os.listdir(temp_folder):
            os.rmdir(temp_folder)

@router.post("/delete-from-mega/")
async def delete_from_mega(megaFile: DeleteMegaRequest, request: Request):
    try:
        # Attempt to delete the file from Mega
        # Find the folder by name
        folders = m.find(megaFile.username)
        if not folders:
            raise HTTPException(status_code=404, detail=f"Folder {megaFile.username} not found.")
        else:
            folder = folders[0]  # Assuming the first matching folder
            # List all files in the folder
            files = m.get_files_in_node(folder)
            if not files:
                raise HTTPException(status_code=404, detail=f"No files found in the folder '{megaFile.username}'.")
            else:
                # Find the specific file by name and delete it
                file_found = False
                for file_id, file_info in files.items():
                    if file_info['a']['n'] == megaFile.sourceName:
                        m.delete(file_id)
                        file_found = True
                        break
                if not file_found:
                    raise HTTPException(status_code=404, detail=f"File '{megaFile.sourceName}' not found in folder '{megaFile.username}'.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting file from Mega: {str(e)}")

def get_stream_url(youtube_url):
    ydl_opts = {
        'format': 'bestvideo[height<=1080]',  # Best quality video and audio
        'noplaylist': True,  # Disable playlist download
        'quiet': True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info_dict = ydl.extract_info(youtube_url, download=False)
            if 'formats' in info_dict:
                # Choose the 720p resolution stream under the specified criteria
                stream_url = next((f['url'] for f in info_dict['formats'] if f['vcodec'] != 'none' and f.get('height', 0) == 720), None)
                if stream_url:
                    return stream_url
            return None
        except Exception as e:
            print(f"Error getting stream URL: {e}")
            return None

@router.post("/validate-source")
async def validate_source(sourcePath: SourceValidationRequest):
    try:
        source_path = sourcePath.sourcePath

        if source_path.isdigit():
            source_path = int(source_path)
        elif source_path.startswith("https://www.youtube.com/"):
            source_path = get_stream_url(source_path)
        
        cap = cv2.VideoCapture(source_path)
        if not cap.isOpened():
            return {"valid": False, "message": "Unable to connect to IP camera"}
        
        ret, frame = cap.read()
        cap.release()
        
        if ret:
            return {"valid": True, "message": "IP camera is valid"}
        else:
            return {"valid": False, "message": "Could not read from IP camera"}
    except Exception as e:
        return {"valid": False, "message": f"Error: {str(e)}"}
    
def get_reader_by_source_id(source_id: str, request: Request):
    """
    Retrieve the Reader instance for a given source_id from app state.
    If the reader doesn't exist, raise an exception or return None.
    """
    if source_id not in request.app.readers:
        raise ValueError(f"Reader for source_id {source_id} not found.")
    return request.app.readers[source_id]

def download_file_from_mega(m, folder_name, file_name, download_path):
    """
    Download a specific file from a Mega folder.

    Args:
        m: Mega object instance.
        folder_name (str): Name of the folder to search for.
        file_name (str): Name of the file to download.
        download_path (str): Path where the file should be downloaded.

    Raises:
        FileNotFoundError: If the folder or file is not found.
        RuntimeError: If the download fails.
    """
    # Find the folder by name
    folders = m.find(folder_name)
    if not folders:
        raise FileNotFoundError(f"Folder '{folder_name}' not found.")

    folder = folders[0]  # Assuming the first matching folder

    # List all files in the folder
    files = m.get_files_in_node(folder)
    if not files:
        raise FileNotFoundError(f"No files found in the folder '{folder_name}'.")

    # Find the specific file by name and download it
    for file_id, file_info in files.items():
        if file_info['a']['n'] == file_name:
            try:
                m.download((file_id, file_info), download_path)
                return download_path+"/"+file_name
            except Exception as e:
                raise RuntimeError(f"Failed to download file '{file_name}': {e}")

    # If the loop completes and no file is found, raise an exception
    raise FileNotFoundError(f"File '{file_name}' not found in folder '{folder_name}'.")

@router.post("/create_reader/")
async def create_reader(request: Request, body: CreateReaderRequest):
    """
    Create and store a Reader instance in app.
    """
    source_path = body.source_path

    if body.source_type == "Local Video":
        try:
            # Download the file from Mega
            mega = request.app.mega
            file = download_file_from_mega(mega, source_path.split(",")[0], source_path.split(",")[1], "C:/Users/Wei/Downloads/AI_Gauge_Reader/server/temp")
            source_path = file
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to download file from Mega: {str(e)}")
    elif source_path.isdigit():
        source_path = int(source_path)
    elif source_path.startswith("https://www.youtube.com/"):
        source_path = get_stream_url(source_path)

    reader = Reader(
                    user_id=body.user,
                    source_id=body.source_id,
                    source_type=body.source_type,
                    source=source_path,
                    gauge_detection_model=request.app.gauge_detection_model,
                    ocr_model=request.app.ocr_model,
                    base_min_max_model=request.app.base_min_max_model,
                    needle_segmentation_model=request.app.needle_segmentation_model,
                    db=request.app.database,
                    dropbox=request.app.dropbox)
            
    request.app.readers[body.source_id] = reader
    print("Starting background task for reader...")
    reader.task = request.app.loop.create_task(reader.predict())
    return {"message": "Reader created successfully"}

@router.post("/pause_reader/{source_id}")
async def pause_reader(source_id: str, request: Request):
    reader = request.app.readers.get(source_id)
    if not reader:
        raise HTTPException(status_code=404, detail="Reader not found")
    reader.pause()
    return {"message": "Reader paused"}

@router.post("/resume_reader/{source_id}")
async def resume_reader(source_id: str, request: Request):
    reader = request.app.readers.get(source_id)
    if not reader:
        raise HTTPException(status_code=404, detail="Reader not found")
    reader.resume()
    return {"message": "Reader resumed"}

@router.delete("/delete_reader/{source_id}", response_model=dict)
async def delete_reader(source_id: str, request: Request):
    # Check if the reader exists
    reader = request.app.readers.pop(source_id, None)
    if reader:
        # Stop the reader
        reader.stop()

        # If the source_type is "Local Video", check if the source file exists and delete it
        if reader.source_type == "Local Video" and os.path.exists(reader.source):
            try:
                os.remove(reader.source)
                print(f"Deleted local video file: {reader.source}")
            except Exception as e:
                print(f"Failed to delete local video file: {reader.source}. Error: {str(e)}")

    return {"message": "Reader deleted successfully"}

@router.put("/users/{user_id}")
async def update_user(user_id: str, user_update: UserUpdate, request: Request):
    user = await request.app.database["users"].find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await request.app.database["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": user_update.role}}
    )
    return {"message": "User role updated successfully"}

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, request: Request):
    user = await request.app.database["users"].find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await request.app.database["users"].delete_one({"_id": ObjectId(user_id)})
    return {"message": "User deleted successfully"}

@router.get("/account_type/{user_id}", response_model=dict)
async def get_account_type(user_id: str, request: Request):
    user = await request.app.database["users"].find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"accountType": user.get("accountType", "Unknown")}

@router.put("/users_alert_preferences/{user_id}", response_model=dict)
async def update_alert_preferences(user_id: str, request: Request, body: UpdateAlertPreferencesRequest):
    # Update the user's alert preferences
    result = await request.app.database["users"].find_one_and_update(
        {"_id": ObjectId(user_id)},
        {"$set": {"alertPreferences": body.dict()}},
        return_document=True
    )

    if not result:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "Alert preferences updated successfully"}

@router.get("/users/{user_id}", response_model=dict)
async def get_user(user_id: str, request: Request):
    user = await request.app.database["users"].find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"username": user["username"], "id": str(user["_id"])}

@router.get("/company_users/{company_id}", response_model=list)
async def get_company_users(company_id: str, request: Request):
    users = await request.app.database["users"].find({"companyId": company_id, "role": {"$ne": "pending"}}).to_list(length=None)
    return [{"username": user["username"], "id": str(user["_id"])} for user in users]

@router.post("/department_users/", response_model=List[dict])
async def get_department_users(
    body: DepartmentFilter,  # Change Depends to direct body injection for POST
    request: Request
):
    if not body.departments:
        raise HTTPException(status_code=422, detail="Department list is empty or invalid")
    users = await request.app.database["users"].find({
        "companyId": body.companyId,
        "departments": {"$in": body.departments},
        "role": {"$ne": "pending"}
    }).to_list(length=None)
    return [{"username": user["username"], "id": str(user["_id"])} for user in users]


@router.put("/update_alert_users/{source_id}", response_model=dict)
async def update_alert_users(source_id: str, request: Request, body: UpdateAlertUsersRequest):
    alert_users = body.alertUsers
    result = await request.app.database["sources"].find_one_and_update(
        {"_id": ObjectId(source_id)},
        {"$set": {"alertUsers": alert_users}},
        return_document=True
    )

    if not result:
        raise HTTPException(status_code=404, detail="Source not found")

    return {"message": "Alert users updated successfully"}
#++++++++++++++++++++++++++++++++++++++++++++++++++++NOT SURE CAN USE OR NOT++++++++++++++++++++++++++++++++++++++++++++
# WebSocket endpoint to allow clients to connect
@router.websocket("/ws/sources")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)  # Use the global manager
    try:
        while True:
            data = await websocket.receive_text()  # Listen for incoming messages
            print(f"Received message: {data}")  # Handle any messages from the client
            # Optionally send back a confirmation or some data
            await websocket.send_text(f"Message received: {data}")  # Echo the received message
    except WebSocketDisconnect:
        print("Client disconnected")
        manager.disconnect(websocket)  # Handle disconnection