"""LangGraph graph builder and compiler.

Builds the meeting agent graph with:
  - Supervisor node (routes to specialists)
  - Extraction node (decisions + action items)
  - Assignment node (owner matching + deadline resolution)
  - Reminder node (email reminders + escalation)

Uses MongoDBSaver for checkpoint persistence — NOT AsyncMongoDBSaver
(which has been removed in langgraph-checkpoint-mongodb >= 0.4.0).
"""

import logging

from langgraph.checkpoint.mongodb import MongoDBSaver
from langgraph.graph import END, START, StateGraph
from pymongo import MongoClient

from backend.agents.assignment import assignment_node
from backend.agents.extraction import extraction_node
from backend.agents.reminder import reminder_node
from backend.agents.state import MeetingAgentState
from backend.agents.supervisor import route_after_supervisor, supervisor_node

logger = logging.getLogger(__name__)


def build_graph(checkpointer: MongoDBSaver) -> StateGraph:
    """Build and compile the meeting agent graph.

    Graph topology:
        START → supervisor → {extraction, assignment, reminder, END}
        extraction → supervisor  (loop back for next decision)
        assignment → supervisor
        reminder   → supervisor

    The supervisor uses LLM reasoning to decide which specialist to
    invoke next, enabling a genuinely agentic routing pattern.

    Args:
        checkpointer: MongoDBSaver instance for state persistence.

    Returns:
        Compiled LangGraph graph ready for .invoke() / .ainvoke().
    """
    builder = StateGraph(MeetingAgentState)

    # --- Add nodes ---
    builder.add_node("supervisor", supervisor_node)
    builder.add_node("extraction", extraction_node)
    builder.add_node("assignment", assignment_node)
    builder.add_node("reminder", reminder_node)

    # --- Entry point ---
    builder.add_edge(START, "supervisor")

    # --- Supervisor routes conditionally based on state.next_step ---
    builder.add_conditional_edges(
        "supervisor",
        route_after_supervisor,
        {
            "extraction": "extraction",
            "assignment": "assignment",
            "reminder": "reminder",
            "FINISH": END,
        },
    )

    # --- Specialists loop back to supervisor for next decision ---
    builder.add_edge("extraction", "supervisor")
    builder.add_edge("assignment", "supervisor")
    builder.add_edge("reminder", "supervisor")

    # --- Compile with checkpointer ---
    graph = builder.compile(checkpointer=checkpointer)

    logger.info("Meeting agent graph compiled successfully")
    return graph


def create_graph_with_mongodb(
    mongodb_uri: str, db_name: str
) -> tuple:
    """Create the graph with a fresh MongoDB-backed checkpointer.

    Convenience function for standalone usage. The caller is
    responsible for closing the returned MongoClient.

    Args:
        mongodb_uri: MongoDB connection string.
        db_name: Database name for checkpoints.

    Returns:
        Tuple of (compiled_graph, MongoClient).
    """
    client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=5000)
    checkpointer = MongoDBSaver(client, db_name=db_name)
    graph = build_graph(checkpointer)
    return graph, client
