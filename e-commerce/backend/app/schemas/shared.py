"""Shared Pydantic schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AuditSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    created_by: UUID = Field(..., alias="createdBy")
    created_date: datetime = Field(..., alias="createdDate")
    modified_by: UUID = Field(..., alias="modifiedBy")
    modified_date: datetime = Field(..., alias="modifiedDate")


class Money(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    currency: Literal["INR", "USD", "EUR", "GBP"] | str
    amount: float

