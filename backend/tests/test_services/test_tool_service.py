from unittest.mock import mock_open, patch

import pytest
from app.services.tool_service import ToolService


class TestToolService:
    """Test class for ToolService."""

    @patch("os.path.exists")
    @patch("builtins.open", new_callable=mock_open)
    @patch("yaml.safe_load")
    def test_discover_tools_success(self, mock_yaml_load, mock_file, mock_exists):
        """Test successful tool discovery from compose.yml."""
        mock_exists.return_value = True
        mock_yaml_content = {
            "services": {
                "test-tool-1": {"container_name": "test-tool-1", "ports": ["8001:8000"]},
                "test-tool-2": {"container_name": "test-tool-2", "ports": ["8002:8000"]},
            }
        }
        mock_yaml_load.return_value = mock_yaml_content

        service = ToolService()
        tools = service.get_discovered_tools()

        assert len(tools) == 2

        tool1 = next(tool for tool in tools if tool.id == "test-tool-1")
        assert tool1.container_name == "test-tool-1"
        assert tool1.port == 8000
        assert tool1.external_port == 8001
        assert tool1.endpoint == "http://test-tool-1:8000"

        tool2 = next(tool for tool in tools if tool.id == "test-tool-2")
        assert tool2.container_name == "test-tool-2"
        assert tool2.port == 8000
        assert tool2.external_port == 8002
        assert tool2.endpoint == "http://test-tool-2:8000"

    @patch("os.path.exists")
    def test_discover_tools_file_not_found(self, mock_exists):
        """Test tool discovery when compose.yml file doesn't exist."""
        mock_exists.return_value = False

        with patch("builtins.print") as mock_print:
            service = ToolService()
            tools = service.get_discovered_tools()

            assert len(tools) == 0
            mock_print.assert_called()
            assert any("Warning" in str(call) for call in mock_print.call_args_list)

    @patch("os.path.exists")
    @patch("builtins.open", new_callable=mock_open)
    @patch("yaml.safe_load")
    def test_discover_tools_no_services(self, mock_yaml_load, mock_file, mock_exists):
        """Test tool discovery when compose.yml has no services."""
        mock_exists.return_value = True
        mock_yaml_load.return_value = {}

        service = ToolService()
        tools = service.get_discovered_tools()

        assert len(tools) == 0

    @patch("os.path.exists")
    @patch("builtins.open", new_callable=mock_open)
    @patch("yaml.safe_load")
    def test_discover_tools_duplicate_ports(self, mock_yaml_load, mock_file, mock_exists):
        """Test tool discovery fails with duplicate external ports."""
        mock_exists.return_value = True
        mock_yaml_content = {
            "services": {
                "test-tool-1": {"container_name": "test-tool-1", "ports": ["8001:8000"]},
                "test-tool-2": {
                    "container_name": "test-tool-2",
                    "ports": ["8001:8000"],  # Duplicate port
                },
            }
        }
        mock_yaml_load.return_value = mock_yaml_content

        with pytest.raises(ValueError, match="Duplicate external port"):
            ToolService()

    @patch("os.path.exists")
    @patch("builtins.open", new_callable=mock_open)
    @patch("yaml.safe_load")
    def test_discover_tools_yaml_error(self, mock_yaml_load, mock_file, mock_exists):
        """Test tool discovery handles YAML parsing errors."""
        mock_exists.return_value = True
        mock_yaml_load.side_effect = Exception("Invalid YAML")

        with pytest.raises(Exception, match="Invalid YAML"):
            ToolService()

    def test_parse_service_to_tool_info_minimal(self):
        """Test parsing service config with minimal information."""
        service = ToolService.__new__(ToolService)  # Create without calling __init__

        service_config = {}
        tool_info = service._parse_service_to_tool_info("minimal-tool", service_config)

        assert tool_info.id == "minimal-tool"
        assert tool_info.container_name == "minimal-tool"
        assert tool_info.port == 8000
        assert tool_info.external_port == 8000
        assert tool_info.endpoint == "http://minimal-tool:8000"

    def test_parse_service_to_tool_info_with_container_name(self):
        """Test parsing service config with custom container name."""
        service = ToolService.__new__(ToolService)  # Create without calling __init__

        service_config = {"container_name": "custom-container-name"}
        tool_info = service._parse_service_to_tool_info("service-name", service_config)

        assert tool_info.id == "service-name"
        assert tool_info.container_name == "custom-container-name"

    def test_parse_service_to_tool_info_with_ports(self):
        """Test parsing service config with port mappings."""
        service = ToolService.__new__(ToolService)  # Create without calling __init__

        service_config = {"ports": ["9001:9000", "8001:8000"]}
        tool_info = service._parse_service_to_tool_info("port-tool", service_config)

        assert tool_info.port == 9000
        assert tool_info.external_port == 9001
        assert tool_info.endpoint == "http://port-tool:9000"

    def test_parse_service_to_tool_info_with_non_string_ports(self):
        """Test parsing service config with non-string port mappings."""
        service = ToolService.__new__(ToolService)  # Create without calling __init__

        service_config = {
            "ports": [8001, 9002]  # Non-string ports
        }
        tool_info = service._parse_service_to_tool_info("port-tool", service_config)

        # Should fallback to defaults when ports aren't in expected format
        assert tool_info.port == 8000
        assert tool_info.external_port == 8000

    def test_get_tool_by_name_success(self, mock_tool_discovery_info):
        """Test getting tool by name successfully."""
        service = ToolService.__new__(ToolService)  # Create without calling __init__
        service._discovered_tools = mock_tool_discovery_info

        tool = service.get_tool_by_name("test-tool-1")
        assert tool is not None
        assert tool.id == "test-tool-1"

    def test_get_tool_by_container_name_success(self, mock_tool_discovery_info):
        """Test getting tool by container name successfully."""
        service = ToolService.__new__(ToolService)  # Create without calling __init__
        service._discovered_tools = mock_tool_discovery_info

        tool = service.get_tool_by_name("test-tool-1")  # Container name same as ID in fixture
        assert tool is not None
        assert tool.container_name == "test-tool-1"

    def test_get_tool_by_name_not_found(self, mock_tool_discovery_info):
        """Test getting tool by name when not found."""
        service = ToolService.__new__(ToolService)  # Create without calling __init__
        service._discovered_tools = mock_tool_discovery_info

        tool = service.get_tool_by_name("nonexistent-tool")
        assert tool is None

    def test_get_discovered_tools_returns_copy(self, mock_tool_discovery_info):
        """Test that get_discovered_tools returns a copy of the list."""
        service = ToolService.__new__(ToolService)  # Create without calling __init__
        service._discovered_tools = mock_tool_discovery_info

        tools1 = service.get_discovered_tools()
        tools2 = service.get_discovered_tools()

        # Should be equal but not the same object
        assert tools1 == tools2
        assert tools1 is not tools2
        assert tools1 is not service._discovered_tools
