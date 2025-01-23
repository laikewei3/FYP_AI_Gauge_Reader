import asyncio
from fastapi import FastAPI
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.middleware.cors import CORSMiddleware
from routes.route import router
import urllib.parse
import dotenv
import os
from contextlib import asynccontextmanager
from mega import Mega
import torch
from model.LoadModels.GaugeModelClass import GaugeModelClass
from model.LoadModels.BaseMinMaxClass import BaseMinMaxClass
from model.LoadModels.NeedleSegmentClass import NeedleSegmentClass
from model.LoadModels.OCRClass import OCRClass
from model import project_utils
from dropbox import DropboxOAuth2FlowNoRedirect
from dropbox import Dropbox
import webbrowser
print(os.getcwd())
dotenv.load_dotenv(dotenv_path=os.getcwd()+".env")
DB_USERNAME = os.getenv('DB_USERNAME')
DB_PASSWORD = os.getenv('DB_PASSWORD')
MEGA_EMAIL = str(os.getenv('MEGA_EMAIL'))
MEGA_PASSWORD = str(os.getenv('MEGA_PASSWORD'))
DROP_BOX_APP_KEY = str(os.getenv('DROP_BOX_APP_KEY'))

print("DB_USERNAME:",DB_USERNAME)
print("DB_PASSWORD:",DB_PASSWORD)
print("MEGA_EMAIL:",MEGA_EMAIL)
print("MEGA_PASSWORD:",MEGA_PASSWORD)
print("DROP_BOX_APP_KEY:",DROP_BOX_APP_KEY)

username = urllib.parse.quote_plus(str(DB_USERNAME))
password = urllib.parse.quote_plus(str(DB_PASSWORD))
uri = "mongodb+srv://%s:%s@cluster0.95cn3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0" % (username, password)

async def load_models(device, device_details):
    """Load models asynchronously"""
    # Wrap the blocking model loading operations in asyncio.to_thread
    gauge_model = await asyncio.to_thread(
        lambda: GaugeModelClass(device=device, device_details=device_details)
    )
    
    base_model = await asyncio.to_thread(
        lambda: BaseMinMaxClass(device=device, device_details=device_details)
    )
    
    needle_model = await asyncio.to_thread(
        lambda: NeedleSegmentClass(device=device, device_details=device_details)
    )
    
    return gauge_model, base_model, needle_model

# define a lifespan method for fastapi
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        # # Load each model once
        # device, device_details = project_utils.cuda_availability_details()
        
        # # Load models asynchronously
        # gauge_model, base_model, needle_model = await load_models(device, device_details)
        
        # # Attach models to app state
        # app.gauge_detection_model = gauge_model
        # app.base_min_max_model = base_model
        # app.needle_segmentation_model = needle_model
        # app.ocr_model = OCRClass(device=device, device_details=device_details)
        
        print("All models loaded successfully!")

        # Start the database connection
        await startup_db_client(app)
        yield
        # Close the database connection
        await shutdown_db_client(app)
    except Exception as e:
        print(f"Error loading models: {str(e)}")
        raise

# method for start the MongoDb Connection
async def startup_db_client(app):
    app.loop = asyncio.get_event_loop()
    app.mongodb_client = AsyncIOMotorClient(uri)
    app.database = app.mongodb_client.get_database("gauge_db")
    print("MongoDB connected.")
    mega = Mega()
    app.mega = mega.login(MEGA_EMAIL, MEGA_PASSWORD)
    print("Mega connected.")
    # Initialize an empty dictionary to store Reader instances
    app.readers = {}
    # auth_flow = DropboxOAuth2FlowNoRedirect(DROP_BOX_APP_KEY, use_pkce=True, token_access_type='offline')
    # authorize_url = auth_flow.start()
    # # following code line opens automaticaly the browser with the generated url by dropbox for authentication
    # webbrowser.open_new_tab(authorize_url)
    # print("1. This is the link to start the autentication. In case it will not be open, copy and paste it: " + authorize_url)
    # print("2. Click \"Allow\" (you might have to log in first).")
    # print("3. Copy the authorization code.")

    # auth_code = input("Enter the authorization code here: ").strip()
    # try:
    #     oauth_result = auth_flow.finish(auth_code)
    # except Exception as e:
    #     print("Error: %s" % (e,))
    #     print("Please try again.")
    # app.dropbox = Dropbox(oauth2_refresh_token=oauth_result.refresh_token, app_key=DROP_BOX_APP_KEY)
    # app.dropbox.users_get_current_account()
    # print("Successfully connected to Dropbox!")


async def shutdown_readers(app):
    """
    Gracefully shuts down all readers by updating their status to 'stop' in MongoDB.

    Args:
        app: FastAPI app instance containing the readers.
    """
    db = app.database
    for source_id, _ in app.readers.items():
        try:
            print(f"Shutting down reader {source_id}...")
            await db.sources.update_one({"sourceId": source_id}, {"$set": {"status": "stop"}})
        except Exception as e:
            print(f"Failed to update status for reader {source_id}: {e}")
    print("All readers have been stopped and statuses updated in MongoDB.")


# method to close the database connection
async def shutdown_db_client(app):
    if hasattr(app, "readers") and hasattr(app, "database"):
        await shutdown_readers(app)
    if hasattr(app, "database"):
        app.mongodb_client.close()
        print("Database disconnected.")
    if hasattr(app, "dropbox"):
        app.dropbox.close()
        print("Dropbox connection closed.")
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

# creating a server with python FastAPI
app = FastAPI(lifespan=lifespan)
app.include_router(router)


origins = [
    "http://localhost:5173",
    "http://127.0.0.1:8000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Replace with your front-end URL in production
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods
    allow_headers=["*"],  # Allows all headers
)