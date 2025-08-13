from pathlib import Path


def test_mock_corpora_root_fixture(mock_corpora_root):
    """Test that mock_corpora_root fixture works."""
    assert isinstance(mock_corpora_root, Path)
    assert mock_corpora_root.exists()


def test_mock_compose_yml_content_fixture(mock_compose_yml_content):
    """Test that mock_compose_yml_content fixture works."""
    assert isinstance(mock_compose_yml_content, str)
    assert "version: '3.8'" in mock_compose_yml_content
    assert "test-tool-1" in mock_compose_yml_content
