import numpy as np
from js import document, setInterval, clearInterval
from pyodide import create_proxy

class Panel:
    def __init__(self, title, description, image_url, link_url):
        self.title = title
        self.description = description
        self.image_url = image_url
        self.link_url = link_url

panels = [
    Panel("Feature 1", "Description of feature 1", "/api/placeholder/100/100", "#feature1"),
    Panel("Feature 2", "Description of feature 2", "/api/placeholder/100/100", "#feature2"),
    Panel("Feature 3", "Description of feature 3", "/api/placeholder/100/100", "#feature3"),
    Panel("Feature 4", "Description of feature 4", "/api/placeholder/100/100", "#feature4"),
    Panel("Feature 5", "Description of feature 5", "/api/placeholder/100/100", "#feature5"),
]

def create_panel_element(panel):
    panel_div = document.createElement("div")
    panel_div.className = "panel bg-white rounded-lg shadow-md p-4 flex flex-col items-center"
    panel_div.innerHTML = f"""
        <img src="{panel.image_url}" alt="{panel.title}" class="w-24 h-24 rounded-full mb-4">
        <h2 class="text-xl font-bold mb-2">{panel.title}</h2>
        <p class="text-gray-600 mb-4">{panel.description}</p>
        <a href="{panel.link_url}" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
            Learn More
        </a>
    """
    return panel_div

def initialize_panels():
    global container, panel_elements, current_index
    container = document.getElementById("panel-container")
    panel_elements = [create_panel_element(panel) for panel in panels]

    for element in panel_elements[:3]:
        container.appendChild(element)

    current_index = 0

def rotate_panels():
    global current_index
    next_index = (current_index + 1) % len(panels)
    
    current_panel = panel_elements[current_index]
    next_panel = panel_elements[next_index]
    
    current_panel.style.transform = "translateX(-100%)"
    next_panel.style.transform = "translateX(0)"
    
    container.removeChild(current_panel)
    container.appendChild(next_panel)
    
    current_index = next_index

def start_rotation():
    global rotate_proxy, interval_id
    rotate_proxy = create_proxy(rotate_panels)
    interval_id = setInterval(rotate_proxy, 5000)  # Rotate every 5 seconds

initialize_panels()
start_rotation()
