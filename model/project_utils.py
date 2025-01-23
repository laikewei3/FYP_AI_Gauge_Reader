import torch
import platform

def cuda_availability_details(device=None):
    use_cuda = torch.cuda.is_available()
    if device is None:
        device = torch.device("cuda" if use_cuda else "cpu") 
    else:
        device = torch.device(device)
    if device.type == 'cuda':
        return device, {
            '__CUDA VERSION:':torch.version.cuda,
            '__CUDNN VERSION:': torch.backends.cudnn.version(),
            '__Number CUDA Devices:': torch.cuda.device_count(),
            '__CUDA Device Name:':torch.cuda.get_device_name(0),
            '__CUDA Device Total Memory [GB]:':torch.cuda.get_device_properties(0).total_memory/1e9
        }
    else:
        return device, {
            'Platform processor:': platform.processor(),
            'Platform architecture:': platform.architecture(),
            'Machine type:': platform.machine(),
            "System's network name:": platform.node(),
            'Platform information:': platform.platform(),
            'Operating system:': platform.system(),
            'System info:': platform.system(),
            'Python build no. and date:': platform.python_build(),
            'Python compiler:': platform.python_compiler(),
            'Python SCM:': platform.python_compiler(),
            'Python implementation:': platform.python_implementation(),
            'Python version:': platform.python_version()
        }
    
def cuda_availability():
    use_cuda = torch.cuda.is_available()
    return torch.device("cuda" if use_cuda else "cpu") 