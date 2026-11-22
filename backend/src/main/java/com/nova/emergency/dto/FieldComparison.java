package com.nova.emergency.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FieldComparison {
    private String field;
    private String oldValue;
    private String newValue;
    private List<String> addedText;
    private List<String> removedText;

    public String getField() { return field; }
    public void setField(String field) { this.field = field; }

    public String getOldValue() { return oldValue; }
    public void setOldValue(String oldValue) { this.oldValue = oldValue; }

    public String getNewValue() { return newValue; }
    public void setNewValue(String newValue) { this.newValue = newValue; }

    public List<String> getAddedText() { return addedText; }
    public void setAddedText(List<String> addedText) { this.addedText = addedText; }

    public List<String> getRemovedText() { return removedText; }
    public void setRemovedText(List<String> removedText) { this.removedText = removedText; }
}
