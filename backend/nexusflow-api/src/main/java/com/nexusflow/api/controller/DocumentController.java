package com.nexusflow.api.controller;

import com.nexusflow.api.repository.DocumentRepository;
import com.nexusflow.api.service.DocumentService;
import com.nexusflow.common.dto.DocumentDto;
import com.nexusflow.common.dto.PageDto;
import com.nexusflow.common.dto.UploadResponseDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/documents")
public class DocumentController {

    private static final int MAX_PAGE_SIZE = 100;

    private final DocumentService documents;

    public DocumentController(DocumentService documents) {
        this.documents = documents;
    }

    @GetMapping
    public PageDto<DocumentDto> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "desc") String direction,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "false") boolean archived) {

        var filter = new DocumentRepository.Filter(
                DocumentService.DEMO_USER_ID, q, type, status, archived,
                sort, direction, Math.max(0, page), Math.min(Math.max(1, size), MAX_PAGE_SIZE));

        return documents.list(filter);
    }

    @GetMapping("/{id}")
    public DocumentDto get(@PathVariable UUID id) {
        return documents.get(id);
    }

    @PostMapping("/upload")
    public ResponseEntity<UploadResponseDto> upload(@RequestParam("file") MultipartFile file) {
        UUID id = documents.upload(file);
        return ResponseEntity.accepted().body(new UploadResponseDto(
                id,
                "UPLOADING",
                "/topic/documents/" + id,
                "File received. Processing in background."));
    }
}
