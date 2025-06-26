import yaml
import os
from typing import List, Dict, Any, Optional
from goldmine.types import ToolDiscoveryInfo


class ToolService:
    def __init__(self):
        self._discovered_tools: List[ToolDiscoveryInfo] = []
        self.discover_tools()
    
    def discover_tools(self) -> None:
        """Discover tools from tools/compose.yml"""
        compose_file_path = os.path.join(os.path.dirname(__file__), "../../../tools/compose.yml")
        
        if not os.path.exists(compose_file_path):
            print(f"Warning: tools/compose.yml not found at {compose_file_path}")
            return
        
        try:
            with open(compose_file_path, 'r') as file:
                compose_data = yaml.safe_load(file)
            
            self._discovered_tools = []
            external_ports_used = {}
            
            if 'services' in compose_data:
                for service_name, service_config in compose_data['services'].items():
                    tool_info = self._parse_service_to_tool_info(service_name, service_config)
                    if tool_info:
                        # Check for duplicate external ports
                        if tool_info.external_port in external_ports_used:
                            raise ValueError(
                                f"Duplicate external port {tool_info.external_port} found in services "
                                f"'{external_ports_used[tool_info.external_port]}' and '{service_name}'"
                            )
                        external_ports_used[tool_info.external_port] = service_name
                        self._discovered_tools.append(tool_info)
            
            print(f"Discovered {len(self._discovered_tools)} tools")
            
        except Exception as e:
            print(f"Error reading tools/compose.yml: {e}")
            raise  # Re-raise to prevent startup with invalid configuration
    
    def _parse_service_to_tool_info(self, service_name: str, service_config: Dict[str, Any]) -> ToolDiscoveryInfo:
        """Parse a Docker Compose service into ToolDiscoveryInfo"""
        
        # Extract container name or use service name
        container_name = service_config.get('container_name', service_name)
        
        # Default internal port for tools
        internal_port = 8000
        
        # Extract external port if available (for host access)
        external_port = None
        ports = service_config.get('ports', [])
        if ports:
            # Parse port mapping like "6000:8000"
            for port_mapping in ports:
                if isinstance(port_mapping, str) and ':' in port_mapping:
                    external_port = int(port_mapping.split(':')[0])
                    # Also extract internal port if different
                    internal_port = int(port_mapping.split(':')[1])
                    break
        
        if external_port is None:
            external_port = internal_port  # Fallback if no external port mapping
        
        # Create the internal endpoint URL (for container-to-container communication)
        endpoint = f"http://{service_name}:{internal_port}"
        
        return ToolDiscoveryInfo(
            id=service_name,
            container_name=container_name,
            port=internal_port,
            endpoint=endpoint,
            external_port=external_port
        )
    
    def get_discovered_tools(self) -> List[ToolDiscoveryInfo]:
        """Get the list of discovered tools"""
        return self._discovered_tools.copy()
    
    def get_tool_by_name(self, name: str) -> Optional[ToolDiscoveryInfo]:
        """Get a specific tool by name"""
        for tool in self._discovered_tools:
            if tool.id == name or tool.container_name == name:
                return tool
        return None
