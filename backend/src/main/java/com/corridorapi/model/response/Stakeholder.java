package com.corridorapi.model.response;

import com.corridorapi.enums.StakeholderType;
import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class Stakeholder {
    String id;
    String name;
    StakeholderType type;
    String role;                      // why they need to sign off
    List<String> requiredApprovals;
    String contactUrl;
}
